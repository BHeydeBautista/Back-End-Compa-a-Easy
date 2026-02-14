import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';

@Entity()
@Index(['course', 'prerequisite'], { unique: true })
export class CoursePrerequisite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, (course) => course.prerequisites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  prerequisiteId: number;

  @ManyToOne(() => Course, (course) => course.requiredFor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'prerequisiteId' })
  prerequisite: Course;

  @CreateDateColumn()
  createdAt: Date;
}
