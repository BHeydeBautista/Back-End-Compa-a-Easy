import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class PendingRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 128, nullable: false, select: false })
  tokenHash: string;

  @Column({ type: 'timestamptz', nullable: false, select: false })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
