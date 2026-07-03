import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenEntity } from './entities/token.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(TokenEntity) private readonly repo: Repository<TokenEntity>,
  ) {}

  record(data: Partial<TokenEntity>): Promise<TokenEntity> {
    return this.repo.save(this.repo.create(data));
  }

  listByUser(userId: string): Promise<TokenEntity[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async revoke(tokenRef: string): Promise<void> {
    await this.repo.update({ tokenRef }, { revoked: true, revokedAt: new Date() });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity])],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
