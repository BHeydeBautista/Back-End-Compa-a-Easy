import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseType } from '../enums/course-type.enum';
import { RankCourseUnlock } from './rank-course-unlock.entity';
import { UserApprovedCourse } from './user-approved-course.entity';
import { CoursePrerequisite } from './course-prerequisite.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: CourseType,
    nullable: true,
  })
  type?: CourseType | null;

  @Column({ type: 'boolean', default: false })
  requiresAllPreviousAscenso: boolean;

  @OneToMany(() => RankCourseUnlock, (unlock) => unlock.course)
  rankUnlocks: RankCourseUnlock[];

  @OneToMany(() => UserApprovedCourse, (approved) => approved.course)
  approvals: UserApprovedCourse[];

  @OneToMany(() => CoursePrerequisite, (pr) => pr.course)
  prerequisites: CoursePrerequisite[];

  @OneToMany(() => CoursePrerequisite, (pr) => pr.prerequisite)
  requiredFor: CoursePrerequisite[];
}
