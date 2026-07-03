import { BaseEntity } from '@app/database';
import { Column, Entity } from 'typeorm';

@Entity('webhook_endpoint')
export class WebhookEndpointEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'json' })
  events: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
