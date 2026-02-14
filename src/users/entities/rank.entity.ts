import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RankCourseUnlock } from './rank-course-unlock.entity';
import { User } from './user.entity';

@Entity()
export class Rank {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => User, (user) => user.rank)
  users: User[];

  @OneToMany(() => RankCourseUnlock, (unlock) => unlock.rank)
  unlockedCourses: RankCourseUnlock[];
}
