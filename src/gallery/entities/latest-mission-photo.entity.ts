import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['slot'], { unique: true })
export class LatestMissionPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  slot: number;

  @Column({ type: 'varchar', length: 255 })
  publicId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
