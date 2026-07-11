# IAM Platform · Monorepo 架构设计

> 技术栈：**NestJS + TypeORM + mysql2 + Redis**，采用 **NestJS 官方 Monorepo 模式**。
> 本文档承接 [`系统架构.md`](./系统架构.md) 的业务域划分，落地为工程结构、技术选型与工程规范。

---

## 一、技术选型

| 分类 | 选型 | 说明 |
| --- | --- | --- |
| 运行时 | Node.js ≥ 20 (LTS) | 原生 fetch、性能更好 |
| 框架 | NestJS 10+ | 模块化、DI、Monorepo 内建支持 |
| ORM | TypeORM 0.3+ | 实体 + 迁移 + Repository |
| 驱动 | mysql2 | TypeORM 的 MySQL 驱动 |
| 数据库 | MySQL 8.4 | 见 `docker-compose.yaml` |
| 缓存/限流 | Redis 7.4 | Session、限流、验证码、队列 backend |
| 认证 | better-auth | 登录/注册/Session（Identity 域） |
| 协议 | node-oidc-provider | OAuth2 / OIDC（Security 域） |
| 授权 | CASL | ABAC / 策略引擎（Access 域） |
| 队列 | BullMQ | 邮件、短信、Webhook 异步任务 |
| 校验 | class-validator / class-transformer | DTO 校验 |
| 配置 | @nestjs/config + Joi/zod | `.env` 加载与校验 |
| 包管理 | pnpm | Monorepo 首选，节省磁盘、软链共享 |

---

## 二、Monorepo 顶层结构

采用「**业务模块留在 app 内、基础设施下沉到 libs**」的策略。当前只有一个可部署应用 `iam`，未来拆微服务时，libs 可被多个 app 直接复用。

```
iam-platform/
├── apps/
│   └── iam/                     # 主应用：HTTP API + OIDC Provider
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── modules/         # 八大业务域（见系统架构.md）
│       ├── test/
│       └── tsconfig.app.json
│
├── libs/                        # 可复用的基础设施包（@app/*）
│   ├── common/                  # @app/common   装饰器/过滤器/管道/拦截器/工具
│   ├── config/                  # @app/config   配置加载 + schema 校验
│   ├── database/                # @app/database TypeORM DataSource / 迁移 / 基类实体
│   ├── cache/                   # @app/cache    Redis 客户端 + 缓存装饰器
│   ├── logger/                  # @app/logger   pino 日志
│   ├── queue/                   # @app/queue    BullMQ 封装
│   └── contracts/               # @app/contracts 跨域接口 + 领域事件契约（关键！）
│
├── nest-cli.json                # monorepo projects 配置
├── tsconfig.json                # paths: @app/* → libs/*
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yaml
└── .env
```

> 说明：`系统架构.md` 里把 `shared/` 放在 `apps/iam` 内。这里将其提升为顶层 `libs/`，语义等价但更符合 Monorepo「共享代码可跨 app 引用」的定位。业务域模块（identity/organization/...）**仍保留在 `apps/iam/src/modules`**，因为它们是业务实现而非通用基础设施。

### nest-cli.json（示意）

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/iam/src",
  "monorepo": true,
  "root": "apps/iam",
  "projects": {
    "iam":       { "type": "application", "root": "apps/iam", "sourceRoot": "apps/iam/src", "entryFile": "main" },
    "common":    { "type": "library", "root": "libs/common",    "sourceRoot": "libs/common/src" },
    "config":    { "type": "library", "root": "libs/config",    "sourceRoot": "libs/config/src" },
    "database":  { "type": "library", "root": "libs/database",  "sourceRoot": "libs/database/src" },
    "cache":     { "type": "library", "root": "libs/cache",     "sourceRoot": "libs/cache/src" },
    "logger":    { "type": "library", "root": "libs/logger",    "sourceRoot": "libs/logger/src" },
    "queue":     { "type": "library", "root": "libs/queue",     "sourceRoot": "libs/queue/src" },
    "contracts": { "type": "library", "root": "libs/contracts", "sourceRoot": "libs/contracts/src" }
  }
}
```

`tsconfig.json` 路径映射：

```json
{
  "compilerOptions": {
    "paths": {
      "@app/common":    ["libs/common/src"],
      "@app/config":    ["libs/config/src"],
      "@app/database":  ["libs/database/src"],
      "@app/cache":     ["libs/cache/src"],
      "@app/logger":    ["libs/logger/src"],
      "@app/queue":     ["libs/queue/src"],
      "@app/contracts": ["libs/contracts/src"]
    }
  }
}
```

---

## 三、业务域模块结构（apps/iam/src/modules）

沿用 `系统架构.md` 的八大域，每个域是一个「聚合模块」，域内再拆子模块：

```
modules/
├── identity/        # 用户是谁、如何认证
│   ├── auth/            better-auth 封装（登录/注册/退出/refresh）
│   ├── user/           用户核心身份
│   ├── profile/        业务资料（昵称/头像...）
│   ├── session/        门户登录态
│   ├── account/        第三方/联邦账号
│   ├── verification/   验证码 / Magic Link
│   ├── device/         登录设备
│   ├── login-history/  登录审计
│   └── identity.module.ts
│
├── organization/    # 用户属于哪里
│   ├── organization/  公司 / 租户
│   ├── department/    部门（树）
│   ├── team/          团队
│   ├── position/      岗位
│   ├── employee/      User ↔ 组织的关系
│   └── organization.module.ts
│
├── application/     # 平台有哪些业务系统
│   ├── application/       应用元数据
│   ├── application-user/  应用授权用户
│   ├── application-role/  应用内角色
│   ├── application-menu/  应用菜单
│   ├── application-setting/ 应用配置
│   └── application.module.ts
│
├── access/          # 用户能做什么（RBAC + ABAC）
│   ├── role/          role_permission / user_role
│   ├── permission/    权限点
│   ├── menu/          后台菜单
│   ├── policy/        CASL 策略
│   ├── resource/      资源定义
│   ├── data-permission/ 数据权限范围
│   └── access.module.ts
│
├── security/        # 安全协议与治理
│   ├── oidc/          node-oidc-provider（adapters/interactions/...）
│   ├── oauth-client/  client_id / secret / redirect_uris
│   ├── token/         协议令牌
│   ├── api-key/       无 OAuth 的机器凭证
│   ├── audit/         敏感操作审计
│   ├── login-policy/  密码/MFA/锁定策略
│   ├── rate-limit/    限流
│   ├── blacklist/     JWT/Token/IP 黑名单
│   └── security.module.ts
│
├── notification/    # 统一通知中心（email/sms/webhook/template/queue）
├── storage/         # 统一文件服务（local/s3/oss/minio/file/upload）
└── system/          # 平台运行配置（config/dictionary/parameter/scheduler/health）
```

每个「叶子」子模块统一采用分层：`dto / entities / repositories / controllers / services / *.module.ts`。

---

## 四、依赖方向与跨域协作（工程落地关键）

`系统架构.md` 已明确「**固定依赖方向，禁止 `forwardRef` 满天飞**」。工程上通过 `@app/contracts` 强制约束。

### 4.1 允许的静态依赖方向（单向）

```
Identity → Organization → Application → Access → Security
```

- 下游可以 import 上游导出的 **Service Token / 接口**，上游不得反向 import 下游。
- 例外的横向能力（Notification / Storage / System）作为「平台能力」，任何域都可依赖，但它们不依赖任何业务域。

### 4.2 跨域只走「契约 + 事件」，不直接注入实现

`@app/contracts` 定义 **接口 + 注入 Token + 事件类型**，各域 provide 具体实现：

```ts
// libs/contracts/src/organization/organization.contract.ts
export const ORGANIZATION_QUERY = Symbol('ORGANIZATION_QUERY');

export interface IOrganizationQuery {
  /** access 域算数据权限时，问 organization 域「这个用户能管哪些部门」 */
  getManagedDepartmentIds(userId: string): Promise<string[]>;
  getUserOrgContext(userId: string): Promise<{ orgId: string; departmentId?: string } | null>;
}
```

Access 域注入接口而非 OrganizationService 实现，从而消除循环依赖（对应架构文档的边界问题 #5）。

### 4.3 auth ↔ oidc 的桥接层（边界问题 #1）

在 `identity/auth` 下新增 `interaction` 子模块作为唯一桥接点：

```
node-oidc-provider  ──(/interaction/:uid)──►  identity/auth/interaction
        │                                              │
        │  interactionFinished()  ◄───────────────────┘  调 better-auth 校验账密/MFA
```

- `identity/auth`：只负责「账密/MFA 是否正确」，不懂 OIDC 协议。
- `security/oidc`：只负责签发 code/token、SSO session，不懂密码怎么校验。
- 两者**只通过 interaction 一个点交互**，互不 import 对方实现。

### 4.4 application ↔ oauth-client（边界问题 #2）

- `application` 只存业务元数据（权威来源）。
- `security/oauth-client` 存 `client_secret` 等敏感凭证，通过 `oauth_client.application_id` 外键关联，**不冗余存储**，查询 application 列表不暴露 secret。

---

## 五、libs 各包职责

| 包 | 职责 | 关键导出 |
| --- | --- | --- |
| `@app/common` | 通用 HTTP 基础件 | 全局异常过滤器、响应拦截器、`@CurrentUser()`、分页 DTO、雪花/UUID 工具 |
| `@app/config` | 配置加载 + 校验 | `AppConfig`、`DatabaseConfig`、`RedisConfig`… 启动即校验 `.env` |
| `@app/database` | 数据访问基础 | `DataSource`、`ormconfig`（迁移用）、`BaseEntity`（id/createdAt/updatedAt/软删）、`typeorm-transactional` |
| `@app/cache` | Redis | `CacheService`、`@Cacheable()` 装饰器、分布式锁 |
| `@app/logger` | 日志 | pino logger + traceId 中间件 |
| `@app/queue` | 异步任务 | BullMQ 队列注册、Processor 基类 |
| `@app/contracts` | 跨域契约 | 各域接口、注入 Token、领域事件（`user.registered`、`user.deleted`…） |

### BaseEntity（统一主键与审计字段）

```ts
// libs/database/src/entities/base.entity.ts
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 }) // ULID/CUID，有序且分布式友好
  id: string;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null; // 软删除
}
```

> 主键统一用 26 位 ULID（`char(26)`）：分布式唯一、天然有序、比 UUID 索引更友好，也便于对齐 better-auth 的 string id。

---

## 六、配置与环境变量

当前 `.env` 已有 MySQL / Redis。建议按域补齐（保持 `.env` 为单一事实来源，`@app/config` 做 schema 校验）：

```dotenv
# App
APP_PORT=3000
APP_ENV=development
APP_URL=http://localhost:3000

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_DATABASE=iam

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# better-auth
BETTER_AUTH_SECRET=please-change-me
BETTER_AUTH_URL=http://localhost:3000

# OIDC
OIDC_ISSUER=http://localhost:3000/oidc
OIDC_COOKIE_KEYS=key1,key2

# Mail / Storage 等后续按需补充
```

---

## 七、数据库连接与迁移策略

- **连接**：`libs/database` 用 `TypeOrmModule.forRootAsync` 注入 `DatabaseConfig`，driver = `mysql2`。
- **实体发现**：`entities: [__dirname + '/../../**/*.entity.{ts,js}']`（monorepo 下按 glob 扫描各域实体）。
- **迁移**：`synchronize: false`（生产必须），统一用 TypeORM migration；迁移文件放 `apps/iam/src/database/migrations`。
- **命名策略**：使用 `snake_case` 命名策略（表/列 → 下划线），实体用 camelCase。
- **事务**：跨表写操作用 `typeorm-transactional` 的 `@Transactional()`，避免手动传 QueryRunner。

npm scripts（示意）：

```jsonc
{
  "scripts": {
    "start:dev":       "nest start iam --watch",
    "build":           "nest build iam",
    "typeorm":         "typeorm-ts-node-commonjs -d apps/iam/src/database/data-source.ts",
    "migration:gen":   "pnpm typeorm migration:generate apps/iam/src/database/migrations/Init",
    "migration:run":   "pnpm typeorm migration:run",
    "migration:revert":"pnpm typeorm migration:revert",
    "seed":            "ts-node apps/iam/src/database/seeds/index.ts"
  }
}
```

---

## 八、请求链路（对齐架构文档的登录流程）

```
浏览器 → security/oidc (/authorize)
      → identity/auth/interaction (/interaction/:uid) → better-auth 校验账密/MFA
      → identity/user 确认身份
      → organization 加载组织上下文（通过 @app/contracts 接口）
      → application 校验用户是否可访问该应用
      → access 计算角色/权限/菜单/数据权限
      → security/oidc 签发 code → token（audit 记录）
      → 下游应用（Workflow/Admin...）拿到 Access Token
```

---

## 九、下一步落地顺序建议

1. `libs/database` + `libs/config`：先把连接、BaseEntity、迁移跑通。
2. **Identity 域**（user/auth/profile/session/account/verification）——对齐 better-auth schema。
3. **Access 域**（role/permission/user_role/role_permission）——RBAC 最小闭环。
4. **Application + Security/oauth-client + oidc**——打通 SSO。
5. Organization / Notification / Storage / System 按业务优先级补齐。

> 具体库表见 [`库表设计.md`](./库表设计.md)。
