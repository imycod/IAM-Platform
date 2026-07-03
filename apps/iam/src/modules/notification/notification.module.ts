import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplateEntity } from './template/entities/notification-template.entity';
import { NotificationLogEntity } from './queue/entities/notification-log.entity';
import { WebhookEndpointEntity } from './webhook/entities/webhook-endpoint.entity';

/**
 * 统一通知中心。真正的发送走 @app/queue（BullMQ/Redis），此处只管模板与结果记录。
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepo: Repository<NotificationTemplateEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
  ) {}

  upsertTemplate(data: Partial<NotificationTemplateEntity>): Promise<NotificationTemplateEntity> {
    return this.templateRepo.save(this.templateRepo.create(data));
  }

  /** 入队一条通知（此处仅落 pending 记录，实际发送交给队列消费者）。 */
  enqueue(data: Partial<NotificationLogEntity>): Promise<NotificationLogEntity> {
    return this.logRepo.save(this.logRepo.create({ ...data, status: 'pending' }));
  }

  async markSent(id: string): Promise<void> {
    await this.logRepo.update({ id }, { status: 'sent', sentAt: new Date() });
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationTemplateEntity,
      NotificationLogEntity,
      WebhookEndpointEntity,
    ]),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
