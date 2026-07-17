import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { ApplicationEntity } from '../application/entities/application.entity';
import { ApplicationUserEntity } from '../application-user/entities/application-user.entity';
import { UpdateApplicationDto } from '../dto/update-application.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(ApplicationUserEntity)
    private readonly appUserRepo: Repository<ApplicationUserEntity>,
  ) {}

  create(data: Partial<ApplicationEntity>): Promise<ApplicationEntity> {
    return this.appRepo.save(this.appRepo.create(data));
  }

  findAll(): Promise<ApplicationEntity[]> {
    return this.appRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<ApplicationEntity> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
    return app;
  }

  async update(id: string, dto: UpdateApplicationDto): Promise<ApplicationEntity> {
    const app = await this.findOne(id);
    const code = dto.code ?? app.code;
    if (code !== app.code) {
      const exists = await this.appRepo.findOne({ where: { code } });
      if (exists && exists.id !== id) {
        throw new ConflictException('应用编码已存在');
      }
    }
    if (dto.name !== undefined) app.name = dto.name;
    if (dto.code !== undefined) app.code = dto.code;
    if (dto.type !== undefined) app.type = dto.type;
    if (dto.status !== undefined) app.status = dto.status;
    if (dto.description !== undefined) app.description = dto.description;
    return this.appRepo.save(app);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.appRepo.softDelete({ id });
  }

  /** 用户是否被授权访问该应用（application_user.status = active）。 */
  async canUserAccess(applicationId: string, userId: string): Promise<boolean> {
    const row = await this.appUserRepo.findOne({
      where: { applicationId, userId, status: 'active' },
    });
    return !!row;
  }

  /** 批量查询活跃的 application_user，返回 `${applicationId}:${userId}` 集合。 */
  async findActiveUserApplicationKeys(
    pairs: Array<{ applicationId: string; userId: string }>,
  ): Promise<Set<string>> {
    const unique = new Map<string, { applicationId: string; userId: string }>();
    for (const pair of pairs) {
      if (!pair.applicationId || !pair.userId) {
        continue;
      }
      unique.set(`${pair.applicationId}:${pair.userId}`, pair);
    }
    if (!unique.size) {
      return new Set();
    }

    const list = [...unique.values()];
    const qb = this.appUserRepo.createQueryBuilder('au').where('au.status = :status', {
      status: 'active',
    });
    qb.andWhere(
      new Brackets((sub) => {
        list.forEach((pair, index) => {
          const clause = `(au.applicationId = :appId${index} AND au.userId = :userId${index})`;
          const params = {
            [`appId${index}`]: pair.applicationId,
            [`userId${index}`]: pair.userId,
          };
          if (index === 0) {
            sub.where(clause, params);
          } else {
            sub.orWhere(clause, params);
          }
        });
      }),
    );

    const rows = await qb.getMany();
    return new Set(rows.map((row) => `${row.applicationId}:${row.userId}`));
  }

  /** 进门校验，不通过则 403。 */
  async assertUserCanAccess(applicationId: string, userId: string): Promise<void> {
    // const app = await this.findOne(applicationId);
    // if (app.status !== 'active') {
    //   throw new ForbiddenException('该应用已禁用，请联系管理员启用');
    // } // finishLogin
    const allowed = await this.canUserAccess(applicationId, userId);
    if (!allowed) {
      throw new ForbiddenException('无权访问该应用，请联系管理员开通 application_user');
    }
  }

  async grantUser(applicationId: string, userId: string): Promise<ApplicationUserEntity> {
    const exists = await this.appUserRepo.findOne({ where: { applicationId, userId } });
    if (exists) {
      return exists;
    }
    return this.appUserRepo.save(
      this.appUserRepo.create({ applicationId, userId, grantedAt: new Date() }),
    );
  }
}
