import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceEntry } from './attendance-entry.entity';

export enum AttendanceType {
  MISSION = 'mission',
  TRAINING = 'training',
}

@Entity()
@Index(['date', 'type'], { unique: true })
export class AttendanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: AttendanceType,
  })
  type: AttendanceType;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => AttendanceEntry, (entry) => entry.session)
  entries: AttendanceEntry[];
}
