import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ConfirmAttendanceDto } from './dto/confirm-attendance.dto';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { AttendanceEntry } from './entities/attendance-entry.entity';
import {
  AttendanceSession,
  AttendanceType,
} from './entities/attendance-session.entity';

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string' &&
    (err as { code: string }).code === '23505'
  );
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceSession)
    private readonly sessionRepository: Repository<AttendanceSession>,
    @InjectRepository(AttendanceEntry)
    private readonly entryRepository: Repository<AttendanceEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async listSessions() {
    const sessions = await this.sessionRepository.find({
      order: { date: 'DESC', id: 'DESC' },
    });

    if (!sessions.length) return [];

    const sessionIds = sessions.map((s) => s.id);
    const counts = await this.entryRepository
      .createQueryBuilder('e')
      .select('e.sessionId', 'sessionId')
      .addSelect('COUNT(*)', 'present')
      .where('e.sessionId IN (:...sessionIds)', { sessionIds })
      .groupBy('e.sessionId')
      .getRawMany<{ sessionId: string; present: string }>();

    const byId = new Map<number, number>();
    for (const c of counts) {
      byId.set(Number(c.sessionId), Number(c.present));
    }

    return sessions.map((s) => ({
      id: s.id,
      date: s.date,
      type: s.type,
      createdAt: s.createdAt,
      presentCount: byId.get(s.id) ?? 0,
    }));
  }

  async createSession(dto: CreateAttendanceSessionDto) {
    try {
      return await this.sessionRepository.save({
        date: dto.date,
        type: dto.type,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Session already exists');
      }
      throw err;
    }
  }

  async getSession(id: number) {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async listSessionUsers(sessionId: number, opts?: { includeDeleted?: boolean }) {
    const session = await this.getSession(sessionId);

    const [users, entries] = await Promise.all([
      this.userRepository.find({
        withDeleted: Boolean(opts?.includeDeleted),
        relations: { rank: true },
        order: { id: 'ASC' },
      }),
      this.entryRepository.find({
        where: { session: { id: sessionId } },
        relations: { user: true },
      }),
    ]);

    const presentUserIds = new Set(entries.map((e) => e.user?.id).filter((id): id is number => typeof id === 'number'));

    const resultUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      division: u.division ?? null,
      role: u.role,
      rank: u.rank ? { id: u.rank.id, name: u.rank.name } : null,
      deletedAt: u.deletedAt ?? null,
      present: presentUserIds.has(u.id),
    }));

    return {
      session: {
        id: session.id,
        date: session.date,
        type: session.type,
      },
      presentCount: entries.length,
      users: resultUsers,
    };
  }

  private async adjustUserCounter(userId: number, type: AttendanceType, delta: 1 | -1) {
    if (type === AttendanceType.MISSION) {
      if (delta === 1) {
        await this.userRepository.increment({ id: userId }, 'missionAttendanceCount', 1);
      } else {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) return;
        const next = Math.max(0, Number(user.missionAttendanceCount ?? 0) - 1);
        await this.userRepository.update({ id: userId }, { missionAttendanceCount: next });
      }
      return;
    }

    if (delta === 1) {
      await this.userRepository.increment({ id: userId }, 'trainingAttendanceCount', 1);
    } else {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return;
      const next = Math.max(0, Number(user.trainingAttendanceCount ?? 0) - 1);
      await this.userRepository.update({ id: userId }, { trainingAttendanceCount: next });
    }
  }

  async confirmAttendance(sessionId: number, dto: ConfirmAttendanceDto) {
    const session = await this.getSession(sessionId);

    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException('User not found');

    try {
      const entry = await this.entryRepository.save({
        session,
        user,
      });
      await this.adjustUserCounter(user.id, session.type, 1);
      return entry;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Already confirmed');
      }
      throw err;
    }
  }

  async unconfirmAttendance(sessionId: number, userId: number) {
    const session = await this.getSession(sessionId);

    const result = await this.entryRepository
      .createQueryBuilder()
      .delete()
      .from(AttendanceEntry)
      .where('"sessionId" = :sessionId AND "userId" = :userId', {
        sessionId,
        userId,
      })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Attendance entry not found');
    }

    await this.adjustUserCounter(userId, session.type, -1);
    return { ok: true };
  }
}
