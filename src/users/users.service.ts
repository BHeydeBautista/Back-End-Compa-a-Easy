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
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
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
      ...createUserDto,
      email,
      password,
      role: createUserDto.role ?? UserRole.USER,
    });

    delete (user as any).password;
    return user;
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
    const user = await this.userRepository.findOne({ where: { id }, withDeleted: true });
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
    const user = await this.userRepository.findOne({ where: { id }, withDeleted: true });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.restore({ id });
    return this.findOne(id);
  }
}
