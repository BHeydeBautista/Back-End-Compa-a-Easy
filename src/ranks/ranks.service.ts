import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../users/entities/course.entity';
import { RankCourseUnlock } from '../users/entities/rank-course-unlock.entity';
import { Rank } from '../users/entities/rank.entity';
import { CreateRankDto } from './dto/create-rank.dto';
import { CreateRankUnlockDto } from './dto/create-rank-unlock.dto';
import { BulkUpsertRanksDto } from './dto/bulk-upsert-ranks.dto';
import { UpdateRankDto } from './dto/update-rank.dto';

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
export class RanksService {
  constructor(
    @InjectRepository(Rank)
    private readonly rankRepository: Repository<Rank>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(RankCourseUnlock)
    private readonly unlockRepository: Repository<RankCourseUnlock>,
  ) {}

  create(dto: CreateRankDto) {
    return this.rankRepository.save({
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  findAll() {
    return this.rankRepository.find({
      order: {
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const rank = await this.rankRepository.findOne({ where: { id } });
    if (!rank) {
      throw new NotFoundException('Rank not found');
    }
    return rank;
  }

  async update(id: number, dto: UpdateRankDto) {
    await this.findOne(id);

    const patch: Partial<Rank> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    if (Object.keys(patch).length === 0) {
      return this.findOne(id);
    }

    await this.rankRepository.update({ id }, patch);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.rankRepository.delete({ id });
    return { ok: true };
  }

  async listUnlocks(rankId: number) {
    await this.findOne(rankId);
    return this.unlockRepository.find({
      where: {
        rank: { id: rankId },
      },
      relations: {
        course: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async addUnlock(rankId: number, dto: CreateRankUnlockDto) {
    const rank = await this.findOne(rankId);

    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    try {
      return await this.unlockRepository.save({
        rank,
        course,
        note: dto.note ?? null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Unlock already exists');
      }
      throw err;
    }
  }

  async removeUnlock(rankId: number, courseId: number) {
    await this.findOne(rankId);

    const result = await this.unlockRepository
      .createQueryBuilder()
      .delete()
      .from(RankCourseUnlock)
      .where('"rankId" = :rankId AND "courseId" = :courseId', {
        rankId,
        courseId,
      })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Unlock not found');
    }

    return { ok: true };
  }

  async bulkUpsert(dto: BulkUpsertRanksDto) {
    const normalized = dto.ranks
      .map((r) => ({
        name: r.name.trim(),
        sortOrder: r.sortOrder ?? 0,
      }))
      .filter((r) => r.name.length > 0);

    if (!normalized.length) {
      return { ok: true, total: 0 };
    }

    // TypeORM upsert by unique name.
    await this.rankRepository.upsert(normalized, ['name']);

    const names = normalized.map((r) => r.name);
    const ranks = await this.rankRepository.find({
      where: names.map((name) => ({ name })),
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return { ok: true, total: normalized.length, ranks };
  }
}
