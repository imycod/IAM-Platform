import * as Joi from 'joi';

/**
 * 启动即校验 .env，缺失或类型错误直接快速失败（fail-fast）。
 */
export const envValidationSchema = Joi.object({
  // App
  APP_PORT: Joi.number().default(3000),
  APP_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
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

  // OIDC
  OIDC_ISSUER: Joi.string().uri().optional(),
  OIDC_COOKIE_KEYS: Joi.string().optional(),
  /** OIDC SSO Session TTL（秒），默认 14 天；测试可设 20 */
  OIDC_SESSION_TTL_SECONDS: Joi.number().integer().min(1).optional(),

  /** 统一登录页（iam-login）地址，OIDC interaction 会跳转至此 */
  IAM_LOGIN_URL: Joi.string().uri().optional(),
  IAM_LOGIN_PORT: Joi.number().integer().min(1).optional(),

  /** CORS 允许 Origin，逗号分隔 */
  CORS_ORIGINS: Joi.string().optional(),

  /** client_id → 应用回跳 URL 的 JSON 映射 */
  APP_RETURN_URLS: Joi.string().optional(),
});
