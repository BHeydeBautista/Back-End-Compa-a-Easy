import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../users/entities/course.entity';
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
  ) {}

  async create(dto: CreateCourseDto) {
    try {
      return await this.courseRepository.save({
        code: dto.code.trim(),
        name: dto.name,
        description: dto.description ?? null,
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
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
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
}
