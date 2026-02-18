import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserCategory } from './enums/user-category.enum';
import { UserDivision } from './enums/user-division.enum';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { CloudinaryService } from '../media/cloudinary.service';

type InternalCreateUserPatch = {
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  emailVerificationTokenHash?: string | null;
  emailVerificationTokenExpiresAt?: Date | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(createUserDto: CreateUserDto & InternalCreateUserPatch) {
    const email = createUserDto.email?.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    let password = createUserDto.password;
    if (password && !password.startsWith('$2')) {
      password = await bcryptjs.hash(password, 10);
    }

    const user = await this.userRepository.save({
      ...(createUserDto as any),
      email,
      password,
      role: createUserDto.role ?? UserRole.USER,
      division: (createUserDto.division ?? UserDivision.FENIX) as any,
    });

    delete (user as any).password;
    return user;
  }

  async findAuthUserById(id: number) {
    if (!id || !Number.isFinite(id) || id <= 0) return null;
    return this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  findOneByEmail(email: string, opts?: { withPassword?: boolean }) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (opts?.withPassword) {
      return this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email: normalizedEmail })
        .getOne();
    }

    return this.userRepository.findOne({ where: { email: normalizedEmail } });
  }

  async findOneByEmailVerificationTokenHash(tokenHash: string) {
    if (!tokenHash) return null;
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.emailVerificationTokenHash')
      .addSelect('user.emailVerificationTokenExpiresAt')
      .where('user.emailVerificationTokenHash = :tokenHash', { tokenHash })
      .getOne();
  }

  async setEmailVerificationToken(
    userId: number,
    patch: { tokenHash: string; expiresAt: Date },
  ) {
    await this.userRepository.update(
      { id: userId },
      {
        emailVerificationTokenHash: patch.tokenHash,
        emailVerificationTokenExpiresAt: patch.expiresAt,
      },
    );
  }

  async markEmailVerified(userId: number) {
    await this.userRepository.update(
      { id: userId },
      {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      },
    );
  }

  async hardDeleteById(userId: number) {
    if (!userId || !Number.isFinite(userId) || userId <= 0) return;
    await this.userRepository.delete({ id: userId });
  }

  async findAll() {
    return this.findAllWithOptions();
  }

  async findAllWithOptions(opts?: { includeDeleted?: boolean }) {
    return this.userRepository.find({
      withDeleted: Boolean(opts?.includeDeleted),
      relations: {
        rank: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: number, opts?: { includeDeleted?: boolean }) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: Boolean(opts?.includeDeleted),
      relations: {
        rank: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patch: Partial<User> = { ...updateUserDto } as any;

    if (Object.keys(patch).length === 0) {
      return this.findOne(id);
    }

    if (patch.email) {
      patch.email = patch.email.trim().toLowerCase();
    }

    if (patch.password && !patch.password.startsWith('$2')) {
      patch.password = await bcryptjs.hash(patch.password, 10);
    }

    await this.userRepository.update({ id }, patch);
    return this.findOne(id, { includeDeleted: true });
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.softDelete({ id });
    return { ok: true };
  }

  async restore(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.restore({ id });
    return this.findOne(id);
  }

  async updateSelfProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patch: Partial<User> = {};

    if (dto.name !== undefined) {
      const name = String(dto.name ?? '').trim();
      if (!name) {
        throw new BadRequestException('Name is required');
      }
      patch.name = name;
    }

    const normalizeOptional = (value: unknown) => {
      if (value === undefined) return undefined;
      const trimmed = String(value ?? '').trim();
      return trimmed.length ? trimmed : null;
    };

    if (dto.steamName !== undefined)
      patch.steamName = normalizeOptional(dto.steamName) as any;
    if (dto.whatsappName !== undefined)
      patch.whatsappName = normalizeOptional(dto.whatsappName) as any;
    if (dto.phoneNumber !== undefined)
      patch.phoneNumber = normalizeOptional(dto.phoneNumber) as any;
    if (dto.discord !== undefined)
      patch.discord = normalizeOptional(dto.discord) as any;

    if (dto.publicName !== undefined)
      patch.publicName = normalizeOptional(dto.publicName) as any;

    if (Object.keys(patch).length === 0) {
      return this.findOne(id);
    }

    await this.userRepository.update({ id }, patch);
    return this.findOne(id);
  }

  async getPublicProfile(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        rank: true,
        approvedCourses: {
          course: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const approvedCourses = (user.approvedCourses ?? [])
      .map((a) => a?.course)
      .filter((c): c is any => Boolean(c))
      .map((c) => ({ code: c.code, name: c.name }));

    return {
      id: user.id,
      name: user.publicName ?? user.name,
      category: user.category ?? null,
      division: user.division ?? null,
      rank: user.rank ? { id: user.rank.id, name: user.rank.name } : null,
      avatarPublicId: user.avatarPublicId ?? null,
      backgroundPublicId: user.backgroundPublicId ?? null,
      courses: {
        approved: approvedCourses,
      },
    };
  }

  async listPublicMembers() {
    const users = await this.userRepository.find({
      relations: { rank: true },
      order: { id: 'ASC' },
    });

    return (users ?? [])
      .filter((u) => u?.role !== UserRole.SUPER_ADMIN)
      .filter((u) => Boolean(u?.rank?.name))
      .map((u) => ({
        id: u.id,
        name: u.publicName ?? u.name,
        category: u.category ?? UserCategory.ENLISTADO,
        division: u.division ?? UserDivision.FENIX,
        rank: u.rank ? { id: u.rank.id, name: u.rank.name } : null,
        avatarPublicId: u.avatarPublicId ?? null,
      }));
  }

  async setAvatar(userId: number, publicId: string) {
    const next = String(publicId ?? '').trim();
    if (!next) {
      throw new BadRequestException('publicId requerido');
    }
    if (!this.cloudinary.assertPublicIdAllowed(next)) {
      throw new BadRequestException('publicId inválido para Cloudinary');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const prev = user.avatarPublicId ?? null;
    await this.userRepository.update({ id: userId }, { avatarPublicId: next });

    if (prev && prev !== next) {
      await this.cloudinary.deleteImage(prev);
    }

    return this.userRepository.findOne({ where: { id: userId } });
  }

  async setBackground(userId: number, publicId: string) {
    const next = String(publicId ?? '').trim();
    if (!next) {
      throw new BadRequestException('publicId requerido');
    }
    if (!this.cloudinary.assertPublicIdAllowed(next)) {
      throw new BadRequestException('publicId inválido para Cloudinary');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const prev = user.backgroundPublicId ?? null;
    await this.userRepository.update(
      { id: userId },
      { backgroundPublicId: next },
    );

    if (prev && prev !== next) {
      await this.cloudinary.deleteImage(prev);
    }

    return this.userRepository.findOne({ where: { id: userId } });
  }
}
