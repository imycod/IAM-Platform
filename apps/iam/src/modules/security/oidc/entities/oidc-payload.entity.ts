import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * node-oidc-provider 的存储适配表：一张表存所有 model
 * （Session / AccessToken / AuthorizationCode / Grant / Interaction ...）。
 * 不继承 BaseEntity：主键为 (id, model)，无软删/审计需求。
 */
@Entity('oidc_payload')
export class OidcPayloadEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  model: string;

  @Column({ type: 'json' })
  payload: Record<string, unknown>;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  grantId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  userCode: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  uid: string | null;

  @Index()
  @Column({ type: 'datetime', precision: 3, nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  consumedAt: Date | null;
}
