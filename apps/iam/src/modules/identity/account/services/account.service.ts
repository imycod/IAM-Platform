import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { AccountEntity } from '../entities/account.entity';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { QueryAccountDto } from '../dto/query-account.dto';

const CREDENTIAL_PROVIDER = 'credential';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly repo: Repository<AccountEntity>,
  ) {}

  async create(dto: CreateAccountDto): Promise<AccountEntity> {
    const exists = await this.repo.findOne({
      where: { providerId: dto.providerId, accountId: dto.accountId },
    });
    if (exists) {
      throw new ConflictException('该 provider 账户已存在');
    }
    const data: Partial<AccountEntity> = {
      userId: dto.userId,
      providerId: dto.providerId,
      accountId: dto.accountId,
      scope: dto.scope ?? null,
    };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    return this.repo.save(this.repo.create(data));
  }

  async findMany(query: QueryAccountDto): Promise<PaginatedResult<AccountEntity>> {
    const where: FindOptionsWhere<AccountEntity> = {};
    if (query.userId) where.userId = query.userId;
    if (query.providerId) where.providerId = query.providerId;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<AccountEntity> {
    const account = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!account) {
      throw new NotFoundException('账户不存在');
    }
    return account;
  }

  async update(id: string, dto: UpdateAccountDto): Promise<AccountEntity> {
    const account = await this.findOne(id);
    if (dto.scope !== undefined) account.scope = dto.scope ?? null;
    if (dto.accountId !== undefined) account.accountId = dto.accountId;
    if (dto.password) {
      account.password = await bcrypt.hash(dto.password, 10);
    }
    return this.repo.save(account);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  async resetCredentialPassword(userId: string, password: string): Promise<AccountEntity> {
    const account = await this.repo.findOne({
      where: { userId, providerId: CREDENTIAL_PROVIDER },
    });
    if (!account) {
      throw new NotFoundException('凭证账户不存在');
    }
    account.password = await bcrypt.hash(password, 10);
    return this.repo.save(account);
  }

  findByProvider(providerId: string, accountId: string): Promise<AccountEntity | null> {
    return this.repo.findOne({ where: { providerId, accountId } });
  }

  listByUser(userId: string): Promise<AccountEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  link(data: Partial<AccountEntity>): Promise<AccountEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async unlink(id: string): Promise<void> {
    await this.repo.softDelete({ id });
  }

  async findManyCredentials(query: QueryAccountDto): Promise<PaginatedResult<AccountEntity>> {
    const qb = this.repo
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.user', 'user')
      .where('account.providerId = :providerId', { providerId: CREDENTIAL_PROVIDER })
      .andWhere('user.deletedAt IS NULL')
      .orderBy('account.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.userId) {
      qb.andWhere('account.userId = :userId', { userId: query.userId });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** 用户删除/恢复时移除邮箱密码凭证，避免孤儿 account 占用唯一键并阻塞重新开通 */
  async removeCredentialsByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId, providerId: CREDENTIAL_PROVIDER });
  }
}
