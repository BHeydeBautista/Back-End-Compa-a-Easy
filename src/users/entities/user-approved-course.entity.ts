import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity()
@Index(['user', 'course'], { unique: true })
export class UserApprovedCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.approvedCourses, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Course, (course) => course.approvals, { onDelete: 'CASCADE' })
  course: Course;

  @CreateDateColumn()
  approvedAt: Date;
}
