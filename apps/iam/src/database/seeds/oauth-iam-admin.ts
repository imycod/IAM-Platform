import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { OauthClientEntity } from '../../modules/security/oauth-client/entities/oauth-client.entity';
import { devRedirectUris, mergeRedirectUris, nginxRedirectUris } from './oauth-redirect-uri.util';

const APP_CODE = 'iam-admin';
export const IAM_ADMIN_SPA_CLIENT_ID = 'iam-admin-spa';

/** iam-admin：直连端口 + Nginx 子域 */
export const IAM_ADMIN_SPA_REDIRECT_URIS = [
  ...devRedirectUris([8088, 5173]),
  ...nginxRedirectUris(['admin.pinshuai.local']),
];

/**
 * 为 iam-client SPA 创建 OIDC 客户端（PKCE 公共客户端）。
 * 运行：pnpm seed:oauth-iam-admin
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const clientRepo = dataSource.getRepository(OauthClientEntity);

    const app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (!app) {
      throw new Error(`应用 ${APP_CODE} 不存在，请先运行 pnpm seed:iam-admin`);
    }

    const existing = await clientRepo.findOne({ where: { applicationId: app.id } });
    if (existing) {
      const merged = mergeRedirectUris(existing.redirectUris, IAM_ADMIN_SPA_REDIRECT_URIS);
      if (merged.length !== (existing.redirectUris?.length ?? 0)) {
        existing.redirectUris = merged;
        await clientRepo.save(existing);
        // eslint-disable-next-line no-console
        console.log(`[seed:oauth-iam-admin] 已更新 redirect_uris: ${merged.join(', ')}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `[seed:oauth-iam-admin] oauth_client 已存在: clientId=${existing.clientId}，redirect_uris 已是最新`,
        );
      }
      return;
    }

    const client = await clientRepo.save(
      clientRepo.create({
        applicationId: app.id,
        clientId: IAM_ADMIN_SPA_CLIENT_ID,
        clientSecret: 'iam-admin-spa-public-not-used',
        redirectUris: IAM_ADMIN_SPA_REDIRECT_URIS,
        grantTypes: ['authorization_code', 'refresh_token'],
        responseTypes: ['code'],
        scopes: ['openid', 'profile', 'email'],
        tokenEndpointAuthMethod: 'none',
        requirePkce: true,
      }),
    );

    // eslint-disable-next-line no-console
    console.log('[seed:oauth-iam-admin] 已创建 OIDC 客户端:');
    // eslint-disable-next-line no-console
    console.log(`  client_id:     ${client.clientId}`);
    // eslint-disable-next-line no-console
    console.log(`  redirect_uris: ${IAM_ADMIN_SPA_REDIRECT_URIS.join(', ')}`);
    // eslint-disable-next-line no-console
    console.log(`  applicationId: ${app.id}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:oauth-iam-admin] 失败:', err);
  process.exit(1);
});
