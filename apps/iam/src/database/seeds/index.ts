import dataSource from '../data-source';
import { UserEntity, UserStatus } from '../../modules/identity/user/entities/user.entity';
import { ProfileEntity } from '../../modules/identity/profile/entities/profile.entity';

/**
 * 初始化种子数据：内置系统管理员 + 其资料。
 * 运行：pnpm seed
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const userRepo = dataSource.getRepository(UserEntity);
    const profileRepo = dataSource.getRepository(ProfileEntity);

    const adminEmail = 'admin@iam.local';
    let admin = await userRepo.findOne({ where: { email: adminEmail } });

    if (!admin) {
      admin = userRepo.create({
        email: adminEmail,
        emailVerified: true,
        name: 'System Admin',
        status: UserStatus.ACTIVE,
        isSystem: true,
      });
      admin = await userRepo.save(admin);

      const profile = profileRepo.create({
        userId: admin.id,
        nickname: '超级管理员',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
      });
      await profileRepo.save(profile);

      // eslint-disable-next-line no-console
      console.log(`[seed] 已创建系统管理员: ${adminEmail} (id=${admin.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.log('[seed] 系统管理员已存在，跳过');
    }
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] 失败:', err);
  process.exit(1);
});
