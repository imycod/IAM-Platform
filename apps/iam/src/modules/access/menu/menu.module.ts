import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuEntity } from './entities/menu.entity';
import { RoleMenuEntity } from './entities/role-menu.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuEntity) private readonly menuRepo: Repository<MenuEntity>,
    @InjectRepository(RoleMenuEntity) private readonly roleMenuRepo: Repository<RoleMenuEntity>,
  ) {}

  create(data: Partial<MenuEntity>): Promise<MenuEntity> {
    return this.menuRepo.save(this.menuRepo.create(data));
  }

  findAll(): Promise<MenuEntity[]> {
    return this.menuRepo.find({ order: { sort: 'ASC' } });
  }

  async setRoleMenus(roleId: string, menuIds: string[]): Promise<void> {
    await this.roleMenuRepo.delete({ roleId });
    if (menuIds.length) {
      await this.roleMenuRepo.save(menuIds.map((menuId) => this.roleMenuRepo.create({ roleId, menuId })));
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([MenuEntity, RoleMenuEntity])],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
