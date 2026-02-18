import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../users/entities/course.entity';
import { CourseInstructor } from '../users/entities/course-instructor.entity';
import { User } from '../users/entities/user.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

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
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseInstructor)
    private readonly courseInstructorRepository: Repository<CourseInstructor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async getCourseOrThrow(id: number) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(dto: CreateCourseDto) {
    try {
      return await this.courseRepository.save({
        code: dto.code.trim(),
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type ?? null,
        requiresAllPreviousAscenso: Boolean(dto.requiresAllPreviousAscenso),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Course code already exists');
      }
      throw err;
    }
  }

  findAll() {
    return this.courseRepository.find({
      order: {
        code: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    return this.getCourseOrThrow(id);
  }

  async update(id: number, dto: UpdateCourseDto) {
    await this.findOne(id);

    const patch: Partial<Course> = { ...dto };
    if (patch.code) {
      patch.code = patch.code.trim();
    }

    try {
      await this.courseRepository.update({ id }, patch);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Course code already exists');
      }
      throw err;
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.courseRepository.delete({ id });
    return { ok: true };
  }

  async listCourseInstructors(courseId: number): Promise<
    Array<{
      id: number;
      user: { id: number; name: string; email: string; role: unknown } | null;
      createdAt: Date;
    }>
  > {
    await this.getCourseOrThrow(courseId);
    const rows = await this.courseInstructorRepository.find({
      where: { course: { id: courseId } },
      relations: { user: true },
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
          }
        : null,
      createdAt: r.createdAt,
    }));
  }

  async addCourseInstructor(
    courseId: number,
    userId: number,
  ): Promise<CourseInstructor> {
    await this.getCourseOrThrow(courseId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    try {
      return await this.courseInstructorRepository.save({
        courseId,
        userId,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Instructor already assigned');
      }
      throw err;
    }
  }

  async removeCourseInstructor(
    courseId: number,
    userId: number,
  ): Promise<{ ok: true }> {
    await this.getCourseOrThrow(courseId);
    const result = await this.courseInstructorRepository
      .createQueryBuilder()
      .delete()
      .from(CourseInstructor)
      .where('"courseId" = :courseId AND "userId" = :userId', {
        courseId,
        userId,
      })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Instructor assignment not found');
    }

    return { ok: true };
  }

  async listInstructorCourses(userId: number): Promise<Course[]> {
    if (!userId || !Number.isFinite(userId) || userId <= 0) {
      throw new NotFoundException('User not found');
    }

    const rows = await this.courseInstructorRepository.find({
      where: { user: { id: userId } },
      relations: { course: true },
      order: { id: 'DESC' },
    });

    return rows.map((r) => r.course).filter((c): c is Course => Boolean(c));
  }
}
