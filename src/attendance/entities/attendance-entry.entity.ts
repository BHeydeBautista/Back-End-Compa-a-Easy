import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AttendanceSession } from './attendance-session.entity';

@Entity()
@Index(['session', 'user'], { unique: true })
export class AttendanceEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AttendanceSession, (session) => session.entries, {
    onDelete: 'CASCADE',
  })
  session: AttendanceSession;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
