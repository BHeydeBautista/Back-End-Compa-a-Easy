import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../users/entities/course.entity';
import { RankCourseUnlock } from '../users/entities/rank-course-unlock.entity';
import { UserApprovedCourse } from '../users/entities/user-approved-course.entity';
import { User } from '../users/entities/user.entity';

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
    const availableCourses = unlocks
      .map((u) => u.course)
      .filter((c): c is Course => Boolean(c))
      .filter((c) => !approvedCourseIds.has(c.id));

    return availableCourses;
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
