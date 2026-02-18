import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../users/entities/course.entity';
import { CourseInstructor } from '../users/entities/course-instructor.entity';
import { CoursePrerequisite } from '../users/entities/course-prerequisite.entity';
import { RankCourseUnlock } from '../users/entities/rank-course-unlock.entity';
import { UserApprovedCourse } from '../users/entities/user-approved-course.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

type EligibilityReason =
  | 'NO_RANK'
  | 'NOT_UNLOCKED'
  | 'ALREADY_APPROVED'
  | 'MISSING_PREREQUISITES'
  | 'COURSE_NOT_FOUND'
  | null;

type CourseLite = { id: number; code: string; name: string };

function isUniqueViolation(err: any): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  return (
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string' &&
    (err as { code: string }).code === '23505'
  );
}

@Injectable()
export class UserCoursesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseInstructor)
    private readonly courseInstructorRepository: Repository<CourseInstructor>,
    @InjectRepository(CoursePrerequisite)
    private readonly prerequisiteRepository: Repository<CoursePrerequisite>,
    @InjectRepository(UserApprovedCourse)
    private readonly approvedRepository: Repository<UserApprovedCourse>,
    @InjectRepository(RankCourseUnlock)
    private readonly unlockRepository: Repository<RankCourseUnlock>,
  ) {}

  private async getUserOrThrow(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        rank: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listApproved(userId: number) {
    await this.getUserOrThrow(userId);

    return this.approvedRepository.find({
      where: {
        user: { id: userId },
      },
      relations: {
        course: true,
      },
      order: {
        approvedAt: 'DESC',
        id: 'DESC',
      },
    });
  }

  async approve(userId: number, courseId: number) {
    const user = await this.getUserOrThrow(userId);

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    try {
      return await this.approvedRepository.save({
        user,
        course,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Course already approved for this user');
      }
      throw err;
    }
  }

  async unapprove(userId: number, courseId: number) {
    await this.getUserOrThrow(userId);

    const result = await this.approvedRepository
      .createQueryBuilder()
      .delete()
      .from(UserApprovedCourse)
      .where('"userId" = :userId AND "courseId" = :courseId', {
        userId,
        courseId,
      })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Approved course not found');
    }

    return { ok: true };
  }

  async listAvailable(userId: number) {
    const user = await this.getUserOrThrow(userId);

    if (!user.rankId) {
      return [];
    }

    const [unlocks, approved] = await Promise.all([
      this.unlockRepository.find({
        where: {
          rank: { id: user.rankId },
        },
        relations: {
          course: true,
        },
      }),
      this.approvedRepository.find({
        where: {
          user: { id: userId },
        },
        relations: {
          course: true,
        },
      }),
    ]);

    const approvedCourseIds = new Set(
      approved
        .map((a) => a.course?.id)
        .filter((id): id is number => typeof id === 'number'),
    );
    const unlockedCourses = unlocks
      .map((u) => u.course)
      .filter((c): c is Course => Boolean(c))
      .filter((c) => !approvedCourseIds.has(c.id));

    const eligible: Course[] = [];
    for (const c of unlockedCourses) {
      const eligibility = await this.getEligibility(userId, c.id);
      if (eligibility.eligible) {
        eligible.push(c);
      }
    }

    return eligible;
  }

  private async assertInstructorOrSuperAdmin(
    requesterId: number,
    requesterRole: UserRole | undefined,
    courseId: number,
  ) {
    if (requesterRole === UserRole.SUPER_ADMIN) return;

    if (requesterRole !== UserRole.FORMACION) {
      throw new ForbiddenException('Forbidden');
    }

    const assigned = await this.courseInstructorRepository.findOne({
      where: { course: { id: courseId }, user: { id: requesterId } },
    });
    if (!assigned) {
      throw new ForbiddenException('Not assigned to this course');
    }
  }

  async listInstructorCourses(requesterId: number, requesterRole?: UserRole) {
    if (!requesterId || !Number.isFinite(requesterId) || requesterId <= 0) {
      throw new NotFoundException('User not found');
    }

    if (requesterRole === UserRole.SUPER_ADMIN) {
      return this.courseRepository.find({ order: { code: 'ASC', id: 'ASC' } });
    }

    const rows = await this.courseInstructorRepository.find({
      where: { user: { id: requesterId } },
      relations: { course: true },
      order: { id: 'DESC' },
    });
    return rows.map((r) => r.course).filter((c): c is Course => Boolean(c));
  }

  async getEligibility(
    userId: number,
    courseId: number,
  ): Promise<{
    eligible: boolean;
    reason: EligibilityReason;
    missingPrerequisites: Course[];
  }> {
    const user = await this.getUserOrThrow(userId);
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      return {
        eligible: false,
        reason: 'COURSE_NOT_FOUND',
        missingPrerequisites: [] as Course[],
      };
    }

    if (!user.rankId) {
      return {
        eligible: false,
        reason: 'NO_RANK',
        missingPrerequisites: [] as Course[],
      };
    }

    const unlock = await this.unlockRepository.findOne({
      where: { rank: { id: user.rankId }, course: { id: courseId } },
    });
    if (!unlock) {
      return {
        eligible: false,
        reason: 'NOT_UNLOCKED',
        missingPrerequisites: [] as Course[],
      };
    }

    const approved = await this.approvedRepository.find({
      where: { user: { id: userId } },
      relations: { course: true },
    });
    const approvedIds = new Set(
      approved
        .map((a) => a.course?.id)
        .filter((id): id is number => typeof id === 'number'),
    );
    if (approvedIds.has(courseId)) {
      return {
        eligible: false,
        reason: 'ALREADY_APPROVED',
        missingPrerequisites: [] as Course[],
      };
    }

    const prereqs = await this.prerequisiteRepository.find({
      where: { course: { id: courseId } },
      relations: { prerequisite: true },
      order: { id: 'ASC' },
    });
    const missing = prereqs
      .map((p) => p.prerequisite)
      .filter((c): c is Course => Boolean(c))
      .filter((c) => !approvedIds.has(c.id));

    if (missing.length) {
      return {
        eligible: false,
        reason: 'MISSING_PREREQUISITES',
        missingPrerequisites: missing,
      };
    }

    return {
      eligible: true,
      reason: null,
      missingPrerequisites: [] as Course[],
    };
  }

  async listInstructorCandidates(
    requesterId: number,
    requesterRole: UserRole | undefined,
    courseId: number,
    opts?: { includeDeleted?: boolean; includeIneligible?: boolean },
  ) {
    await this.assertInstructorOrSuperAdmin(
      requesterId,
      requesterRole,
      courseId,
    );
    await this.courseRepository
      .findOne({ where: { id: courseId } })
      .then((c) => {
        if (!c) throw new NotFoundException('Course not found');
      });

    const users = await this.userRepository.find({
      withDeleted: Boolean(opts?.includeDeleted),
      relations: { rank: true },
      order: { id: 'ASC' },
    });

    const eligible: Array<{
      id: number;
      name: string;
      email: string;
      deletedAt: Date | null;
    }> = [];

    const ineligible: Array<{
      id: number;
      name: string;
      email: string;
      deletedAt: Date | null;
      reason: EligibilityReason;
      missingPrerequisites: CourseLite[];
    }> = [];

    for (const u of users) {
      const e = await this.getEligibility(u.id, courseId);
      if (e.eligible) {
        eligible.push({
          id: u.id,
          name: u.name,
          email: u.email,
          deletedAt: u.deletedAt ?? null,
        });
      } else if (opts?.includeIneligible) {
        ineligible.push({
          id: u.id,
          name: u.name,
          email: u.email,
          deletedAt: u.deletedAt ?? null,
          reason: e.reason,
          missingPrerequisites: (e.missingPrerequisites ?? []).map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
          })),
        });
      }
    }

    return {
      courseId,
      users: eligible,
      ...(opts?.includeIneligible ? { ineligible } : null),
    };
  }

  async instructorApprove(
    requesterId: number,
    requesterRole: UserRole | undefined,
    courseId: number,
    userId: number,
  ) {
    await this.assertInstructorOrSuperAdmin(
      requesterId,
      requesterRole,
      courseId,
    );
    const eligibility = await this.getEligibility(userId, courseId);
    if (!eligibility.eligible) {
      throw new BadRequestException(
        eligibility.reason === 'MISSING_PREREQUISITES'
          ? `Missing prerequisites: ${eligibility.missingPrerequisites.map((c) => c.code).join(', ')}`
          : `Not eligible (${eligibility.reason})`,
      );
    }

    return this.approve(userId, courseId);
  }

  async instructorUnapprove(
    requesterId: number,
    requesterRole: UserRole | undefined,
    courseId: number,
    userId: number,
  ) {
    await this.assertInstructorOrSuperAdmin(
      requesterId,
      requesterRole,
      courseId,
    );
    return this.unapprove(userId, courseId);
  }

  async dashboard(userId: number) {
    const user = await this.getUserOrThrow(userId);
    const [approved, available] = await Promise.all([
      this.listApproved(userId),
      this.listAvailable(userId),
    ]);

    return {
      user: {
        id: user.id,
        name: user.name,
        publicName: user.publicName ?? null,
        email: user.email,
        role: user.role,
        rankId: user.rankId ?? null,
        rank: user.rank ?? null,
        category: user.category ?? null,
        division: user.division ?? null,
        steamName: user.steamName ?? null,
        whatsappName: user.whatsappName ?? null,
        phoneNumber: user.phoneNumber ?? null,
        discord: user.discord ?? null,
        avatarPublicId: user.avatarPublicId ?? null,
        backgroundPublicId: user.backgroundPublicId ?? null,
        missionAttendanceCount: user.missionAttendanceCount,
        trainingAttendanceCount: user.trainingAttendanceCount,
      },
      courses: {
        approved,
        available,
        counts: {
          approved: approved.length,
          available: available.length,
        },
      },
    };
  }
}
