import * as Joi from 'joi';

/**
 * 启动即校验 .env，缺失或类型错误直接快速失败（fail-fast）。
 */
export const envValidationSchema = Joi.object({
  // App
  APP_PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'stage', 'production')
    .default('development'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  /** 额外 CORS 来源，逗号分隔（如其它 SPA：flow-admin :9445） */
  CORS_ORIGINS: Joi.string().optional(),
  APP_GLOBAL_PREFIX: Joi.string().default('api'),

  // MySQL
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_DATABASE: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),

  // better-auth（后续接入）
  BETTER_AUTH_SECRET: Joi.string().optional(),
  BETTER_AUTH_URL: Joi.string().uri().optional(),

  // OIDC（后续接入）
  OIDC_ISSUER: Joi.string().uri().optional(),
  OIDC_COOKIE_KEYS: Joi.string().optional(),
  /**
   * 显式 OIDC 签名 JWKS（私钥 JSON：{ "keys": [ { kty,n,e,d,p,q,dp,dq,qi,... } ] }）。
   * keys[0] 用于签发；其余密钥发布到 /oidc/jwks 供客户端验旧 token（轮换）。
   */
  OIDC_JWKS: Joi.string().optional(),
  /** JWKS 文件路径（相对 cwd 或绝对路径）；与 OIDC_JWKS 二选一，OIDC_JWKS 优先 */
  OIDC_JWKS_FILE: Joi.string().optional(),
  /** 仅 development：未配置时自动生成的 JWKS 落盘路径，默认 secrets/oidc-jwks.json */
  OIDC_JWKS_DEV_FILE: Joi.string().optional(),
  /** OIDC SSO Session / Grant / Interaction TTL（秒），默认 30 天 */
  OIDC_SESSION_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  /** OIDC AccessToken / IdToken TTL（秒），默认 2 小时 */
  OIDC_ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  /** OIDC RefreshToken TTL（秒），默认 30 天，应 ≥ access */
  OIDC_REFRESH_TOKEN_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  /** 账密门户 session TTL（秒），默认 7 天；可被平台 system_config 覆盖 */
  PORTAL_SESSION_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  /** OIDC 授权码 TTL（秒），默认 300 */
  OIDC_AUTHORIZATION_CODE_TTL_SECONDS: Joi.number().integer().min(1).optional(),
});
