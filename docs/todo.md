已知限制（后续处理）
better-auth 与 TypeORM 共管 user/session/account 表需字段映射对齐；当前默认引擎是 credential AuthService，better-auth 引擎已就绪但未设为默认。
OIDC token 端点因 Nest 全局 body-parser 会预读 body，完整授权码流跑通前需为 /oidc 排除 body 解析（discovery/interaction 已可用）。
issuer 用 .env 的 OIDC_ISSUER（3000），实际请求 host 是 3006——生产环境两者应一致。
要我继续的话：补 /oidc 的 body-parser 排除以跑通完整授权码+PKCE 流程，或把 better-auth 设为默认引擎并对齐表结构？