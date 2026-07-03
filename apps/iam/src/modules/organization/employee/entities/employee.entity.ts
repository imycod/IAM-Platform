import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 员工：User ↔ 组织的关系。User ≠ Employee（如 GitHub 登录者是 User 但非 Employee）。
 */
@Entity('employee')
@Index('uq_employee_org_user', ['organizationId', 'userId'], { unique: true })
export class EmployeeEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  organizationId: string;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  departmentId: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  positionId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employeeNo: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'date', nullable: true })
  hiredAt: string | null;
}
