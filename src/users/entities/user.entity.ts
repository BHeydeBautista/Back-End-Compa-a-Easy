import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserCategory } from '../enums/user-category.enum';
import { UserDivision } from '../enums/user-division.enum';
import { UserRole } from '../enums/user-role.enum';
import { Rank } from './rank.entity';
import { UserApprovedCourse } from './user-approved-course.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false, select: false })
  password: string;

  // Default true to avoid locking out existing users when this column is added.
  // New email/password registrations will explicitly set this to false until verified.
  @Column({ type: 'boolean', default: true })
  isEmailVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  emailVerificationTokenHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  emailVerificationTokenExpiresAt?: Date | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @ManyToOne(() => Rank, (rank) => rank.users, { nullable: true })
  @JoinColumn({ name: 'rankId' })
  rank?: Rank | null;

  @Column({ type: 'int', nullable: true })
  rankId?: number | null;

  @Column({
    type: 'enum',
    enum: UserCategory,
    nullable: true,
  })
  category?: UserCategory | null;

  @Column({
    type: 'enum',
    enum: UserDivision,
    nullable: true,
  })
  division?: UserDivision | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  steamName?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  whatsappName?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  discord?: string | null;

  @Column({ type: 'int', default: 0 })
  missionAttendanceCount: number;

  @Column({ type: 'int', default: 0 })
  trainingAttendanceCount: number;

  @OneToMany(() => UserApprovedCourse, (approved) => approved.user)
  approvedCourses: UserApprovedCourse[];

  @DeleteDateColumn()
  deletedAt: Date;
}
