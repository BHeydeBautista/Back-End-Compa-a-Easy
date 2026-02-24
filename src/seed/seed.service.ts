import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../users/entities/course.entity';
import { COURSES_SEED } from './courses.seed-data';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async seedCourses(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const c of COURSES_SEED) {
      const code = String(c.code ?? '').trim();
      const name = String(c.name ?? '').trim();
      if (!code || !name) continue;

      const existing = await this.courseRepository.findOne({ where: { code } });
      if (!existing) {
        await this.courseRepository.save({
          code,
          name,
          description: null,
          type: null,
          requiresAllPreviousAscenso: false,
        });
        created++;
        continue;
      }

      if ((existing.name ?? '').trim() !== name) {
        await this.courseRepository.update({ id: existing.id }, { name });
        updated++;
      }
    }

    this.logger.log(`Done. created=${created} updated=${updated}`);
    return { created, updated };
  }
}
