import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { AccountService } from '../../account/services/account.service';
import { SessionEntity } from '../../session/entities/session.entity';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountService: AccountService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const existingByEmail = dto.email
      ? await this.userRepository.findByEmail(dto.email, true)
      : null;
    const existingByPhone = dto.phone
      ? await this.userRepository.findByPhone(dto.phone, true)
      : null;

    if (
      existingByEmail &&
      existingByPhone &&
      existingByEmail.id !== existingByPhone.id
    ) {
      throw new ConflictException('邮箱与手机号已被不同账号占用');
    }

    const existing = existingByEmail ?? existingByPhone;
    if (existing) {
      if (!existing.deletedAt) {
        if (existingByEmail && dto.email) {
          throw new ConflictException('该邮箱已被注册');
        }
        throw new ConflictException('该手机号已被注册');
      }
      Object.assign(existing, dto);
      await this.userRepository.recover(existing);
      const saved = await this.userRepository.save(existing);
      await this.revokeLoginArtifacts(saved.id);
      return saved;
    }

    const user = this.userRepository.create({
      ...dto,
      status: dto.status ?? UserStatus.PENDING,
    });
    return this.userRepository.save(user);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findMany(query: QueryUserDto): Promise<PaginatedResult<UserEntity>> {
    const [items, total] = await this.userRepository.paginate({
      skip: query.skip,
      take: query.take,
      status: query.status,
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    await this.findOne(id);
    if (dto.email) {
      const existing = await this.userRepository.findByEmail(dto.email, true);
      if (existing && existing.id !== id) {
        throw new ConflictException('该邮箱已被占用');
      }
    }
    if (dto.phone) {
      const existing = await this.userRepository.findByPhone(dto.phone, true);
      if (existing && existing.id !== id) {
        throw new ConflictException('该手机号已被占用');
      }
    }
    await this.userRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    if (user.isSystem) {
      throw new ConflictException('系统内置账号不可删除');
    }
    await this.revokeLoginArtifacts(id);
    await this.userRepository.softDelete(id);
  }

  /** 删除/恢复用户时清理登录凭证与会话，避免孤儿 account 阻塞重新开通 */
  private async revokeLoginArtifacts(userId: string): Promise<void> {
    await Promise.all([
      this.accountService.removeCredentialsByUserId(userId),
      this.sessionRepo.softDelete({ userId }),
    ]);
  }
}
