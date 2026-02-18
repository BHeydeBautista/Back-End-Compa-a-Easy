import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RankCourseUnlock } from './rank-course-unlock.entity';
import { User } from './user.entity';
import { UserDivision } from '../enums/user-division.enum';

@Entity()
export class Rank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({
    type: 'enum',
    enum: UserDivision,
    default: UserDivision.FENIX,
  })
  division: UserDivision;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => User, (user) => user.rank)
  users: User[];

  @OneToMany(() => RankCourseUnlock, (unlock) => unlock.rank)
  unlockedCourses: RankCourseUnlock[];
}
