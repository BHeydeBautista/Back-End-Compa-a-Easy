import {
  Controller,
  ForbiddenException,
  Post,
  Query,
} from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seed: SeedService) {}

  @Post('courses')
  async seedCourses(
    @Query('token') token?: string,
  ): Promise<{ ok: true; created: number; updated: number }> {
    const expected = process.env.SEED_TOKEN;
    if (!expected || !expected.trim()) {
      // Safety: if token isn't configured, route is disabled.
      throw new ForbiddenException('Seed token not configured');
    }

    if (String(token ?? '') !== expected) {
      throw new ForbiddenException('Invalid seed token');
    }

    const result = await this.seed.seedCourses();
    return { ok: true, ...result };
  }
}
