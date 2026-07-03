import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { UserEntity, UserStatus } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  create(data: Partial<UserEntity>): UserEntity {
    return this.repo.create(data);
  }

  save(user: UserEntity): Promise<UserEntity> {
    return this.repo.save(user);
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<UserEntity[]> {
    if (!ids.length) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  findByEmail(
    email: string,
    withDeleted = false,
  ): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email }, withDeleted });
  }

  findByPhone(phone: string, withDeleted = false): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { phone }, withDeleted });
  }

  recover(user: UserEntity): Promise<UserEntity> {
    return this.repo.recover(user);
  }

  async paginate(params: {
    skip: number;
    take: number;
    status?: UserStatus;
  }): Promise<[UserEntity[], number]> {
    const where: FindOptionsWhere<UserEntity> = {};
    if (params.status) {
      where.status = params.status;
    }
    return this.repo.findAndCount({
      where,
      skip: params.skip,
      take: params.take,
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, data: Partial<UserEntity>): Promise<void> {
    await this.repo.update({ id }, data);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete({ id });
  }
}
