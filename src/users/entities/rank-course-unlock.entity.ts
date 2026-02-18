import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { Rank } from './rank.entity';

@Entity()
@Index(['rank', 'course'], { unique: true })
export class RankCourseUnlock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Rank, (rank) => rank.unlockedCourses, {
    onDelete: 'CASCADE',
  })
  rank: Rank;

  @ManyToOne(() => Course, (course) => course.rankUnlocks, {
    onDelete: 'CASCADE',
  })
  course: Course;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', length: 120, nullable: true })
  note?: string | null;
}
