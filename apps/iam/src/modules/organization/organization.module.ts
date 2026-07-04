import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORGANIZATION_QUERY } from '@app/contracts';
import { UserEntity } from '../identity/user/entities/user.entity';
import { OrganizationEntity } from './organization/entities/organization.entity';
import { DepartmentEntity } from './department/entities/department.entity';
import { TeamEntity } from './team/entities/team.entity';
import { TeamMemberEntity } from './team/entities/team-member.entity';
import { PositionEntity } from './position/entities/position.entity';
import { EmployeeEntity } from './employee/entities/employee.entity';
import { OrganizationService } from './organization/services/organization.service';
import { OrganizationController } from './organization/controllers/organization.controller';
import { DepartmentService } from './department/services/department.service';
import { DepartmentController } from './department/controllers/department.controller';
import { EmployeeService } from './employee/services/employee.service';
import { EmployeeController } from './employee/controllers/employee.controller';
import { PositionService } from './position/services/position.service';
import { PositionController } from './position/controllers/position.controller';
import { TeamService } from './team/services/team.service';
import { TeamController } from './team/controllers/team.controller';
import { OrganizationQueryService } from './services/organization-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationEntity,
      DepartmentEntity,
      TeamEntity,
      TeamMemberEntity,
      PositionEntity,
      EmployeeEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    OrganizationController,
    DepartmentController,
    EmployeeController,
    PositionController,
    TeamController,
  ],
  providers: [
    OrganizationService,
    DepartmentService,
    EmployeeService,
    PositionService,
    TeamService,
    OrganizationQueryService,
    { provide: ORGANIZATION_QUERY, useExisting: OrganizationQueryService },
  ],
  exports: [
    OrganizationService,
    DepartmentService,
    EmployeeService,
    PositionService,
    TeamService,
    ORGANIZATION_QUERY,
  ],
})
export class OrganizationModule {}
