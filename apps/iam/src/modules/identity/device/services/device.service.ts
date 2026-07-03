import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { DeviceEntity } from '../entities/device.entity';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { QueryDeviceDto } from '../dto/query-device.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly repo: Repository<DeviceEntity>,
  ) {}

  create(dto: CreateDeviceDto): Promise<DeviceEntity> {
    return this.repo.save(
      this.repo.create({
        ...dto,
        lastActiveAt: new Date(),
      }),
    );
  }

  async findMany(query: QueryDeviceDto): Promise<PaginatedResult<DeviceEntity>> {
    const where: FindOptionsWhere<DeviceEntity> = {};
    if (query.userId) where.userId = query.userId;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { lastActiveAt: 'DESC' },
      relations: ['user'],
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<DeviceEntity> {
    const device = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!device) {
      throw new NotFoundException('设备不存在');
    }
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<DeviceEntity> {
    const device = await this.findOne(id);
    Object.assign(device, dto);
    device.lastActiveAt = new Date();
    return this.repo.save(device);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  listByUser(userId: string): Promise<DeviceEntity[]> {
    return this.repo.find({ where: { userId }, order: { lastActiveAt: 'DESC' } });
  }

  async register(userId: string, data: Partial<DeviceEntity>): Promise<DeviceEntity> {
    let device: DeviceEntity | null = null;
    if (data.fingerprint) {
      device = await this.repo.findOne({ where: { userId, fingerprint: data.fingerprint } });
    }
    if (!device) {
      device = this.repo.create({ ...data, userId });
    } else {
      Object.assign(device, data);
    }
    device.lastActiveAt = new Date();
    return this.repo.save(device);
  }

  async setTrusted(id: string, trusted: boolean): Promise<void> {
    await this.repo.update({ id }, { trusted });
  }
}
