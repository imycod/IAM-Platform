import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { UserEntity } from '../../modules/identity/user/entities/user.entity';
import { AccountEntity } from '../../modules/identity/account/entities/account.entity';

const CREDENTIAL_PROVIDER = 'credential';
const DEFAULT_USER_ID = '01KWGAHQQQC30QQ7T2HQXQ8H9D';
const DEFAULT_PASSWORD = '123456';

/**
 * 为指定用户创建 credential 账号（邮箱密码登录凭证）。
 * 运行：pnpm seed:create-account
 *
 * 可通过环境变量覆盖：
 *   SEED_USER_ID、SEED_PASSWORD
 */
async function run(): Promise<void> {
  const userId = process.env.SEED_USER_ID ?? DEFAULT_USER_ID;
  const plainPassword = process.env.SEED_PASSWORD ?? DEFAULT_PASSWORD;

  await dataSource.initialize();
  try {
    const userRepo = dataSource.getRepository(UserEntity);
    const accountRepo = dataSource.getRepository(AccountEntity);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`用户不存在: id=${userId}`);
    }
    if (!user.email) {
      throw new Error(`用户 ${userId} 未设置 email，无法创建 credential 账号`);
    }

    const existing = await accountRepo.findOne({
      where: { providerId: CREDENTIAL_PROVIDER, accountId: user.email },
    });
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`[seed:create-account] credential 账号已存在: ${user.email}，跳过`);
      return;
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const account = await accountRepo.save(
      accountRepo.create({
        userId: user.id,
        providerId: CREDENTIAL_PROVIDER,
        accountId: user.email,
        password: passwordHash,
      }),
    );

    // eslint-disable-next-line no-console
    console.log(
      `[seed:create-account] 已创建 credential 账号: ${user.email} (accountId=${account.id}, userId=${user.id})`,
    );
    // eslint-disable-next-line no-console
    console.log(`[seed:create-account] 默认密码: ${plainPassword}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:create-account] 失败:', err);
  process.exit(1);
});
