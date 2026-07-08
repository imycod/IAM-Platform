import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AccountEntity } from '../../account/entities/account.entity';
import { AccountService } from '../../account/services/account.service';
import { UserStatus } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import {
  CreateCredentialAdminDto,
  UpdateCredentialAdminDto,
} from '../dto/auth-admin.dto';

const CREDENTIAL_PROVIDER = 'credential';
/** 管理端创建凭证账户时的初始密码（用户首次登录后应修改） */
const DEFAULT_INITIAL_PASSWORD = '123456';

@Injectable()
export class AuthAdminService {
  constructor(
    private readonly accountService: AccountService,
    private readonly userService: UserService,
  ) {}

  async createCredential(dto: CreateCredentialAdminDto): Promise<AccountEntity> {
    const user = await this.userService.findOne(dto.userId);
    if (user.status === UserStatus.DISABLED || user.status === UserStatus.LOCKED) {
      throw new BadRequestException('用户状态不可用，无法开通凭证登录');
    }
    const email = user.email?.trim();
    if (!email) {
      throw new BadRequestException('该用户未设置邮箱，请先在「用户管理」补充邮箱');
    }

    const existingAccounts = await this.accountService.listByUser(user.id);
    const hasCredential = existingAccounts.some(
      (item) => item.providerId === CREDENTIAL_PROVIDER,
    );
    if (hasCredential) {
      throw new ConflictException('该用户已开通邮箱密码登录');
    }

    const password = dto.password?.trim() || DEFAULT_INITIAL_PASSWORD;
    const passwordHash = await bcrypt.hash(password, 10);
    const account = await this.accountService.link({
      userId: user.id,
      providerId: CREDENTIAL_PROVIDER,
      accountId: email,
      password: passwordHash,
    });

    if (user.status === UserStatus.PENDING) {
      await this.userService.update(user.id, { status: UserStatus.ACTIVE });
    }

    return this.accountService.findOne(account.id);
  }

  async updateCredential(
    accountId: string,
    dto: UpdateCredentialAdminDto,
  ): Promise<AccountEntity> {
    const account = await this.accountService.findOne(accountId);
    if (account.providerId !== CREDENTIAL_PROVIDER) {
      throw new NotFoundException('凭证账户不存在');
    }

    await this.accountService.update(account.id, { password: dto.password });
    return this.accountService.findOne(account.id);
  }
}
