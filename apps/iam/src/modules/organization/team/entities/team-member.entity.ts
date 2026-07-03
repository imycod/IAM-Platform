import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('team_member')
@Index('uq_team_member', ['teamId', 'employeeId'], { unique: true })
export class TeamMemberEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  teamId: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  employeeId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  roleInTeam: string | null;
}
