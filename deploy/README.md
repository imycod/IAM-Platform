# 本地 Nginx 上线模拟

通过子域反代宿主机 dev 服务，模拟 `doc/nginx-部署.md` 中的生产拓扑。

## 1. hosts（需管理员权限）

编辑 `C:\Windows\System32\drivers\etc\hosts`，追加：

```text
127.0.0.1 login.iam.local
127.0.0.1 api.iam.local
127.0.0.1 admin.iam.local
127.0.0.1 flow.iam.local
```

## 2. 启动基础设施

```powershell
# MySQL + Redis
cd IAM-Platform
docker compose up -d

# Nginx 网关
cd ..
docker compose -f deploy/docker-compose.nginx.yaml up -d
```

## 3. 启动应用（宿主机）

**重要：** 访问 `*.iam.local` 时，IAM 必须用 **nginx 环境** 启动，否则 SSO 会跳到 `localhost:4180` 而不是 `login.iam.local`。

```powershell
# 推荐：一键启动（IAM nginx 模式 + iam-login + iam-admin）
cd IAM-Platform
pnpm dev:nginx

# 或手动分终端：
# 终端 1 - IAM（必须是 start:dev:nginx，不是 start:dev）
pnpm start:dev:nginx

# 终端 2
pnpm iam-login:dev

# 终端 3
cd apps/iam-admin && pnpm dev
```

启动后 IAM 日志应显示：

```text
OIDC issuer=http://api.iam.local/oidc, IAM_LOGIN_URL=http://login.iam.local
```

若显示 `IAM_LOGIN_URL=http://localhost:4180`，说明用错了启动命令。

## 4. 更新 OAuth redirect_uri（首次或切换模式后）

```powershell
cd IAM-Platform
pnpm seed:oauth-iam-admin
pnpm seed:oauth-flow-admin
```

## 5. 访问地址

| 地址 | 说明 |
|------|------|
| http://admin.iam.local | iam-admin |
| http://flow.iam.local | flow-admin |
| http://login.iam.local | 统一登录 |
| http://api.iam.local/api | IAM API |

`public/config.js` 会根据 `*.iam.local` 自动切换 OIDC 配置，直连 `localhost:8848/8849` 仍可用。

## 6. 停止 Nginx

```powershell
docker compose -f deploy/docker-compose.nginx.yaml down
```

## 7. 故障排查

### 访问 admin.iam.local 没有跳到 login.iam.local

| 原因 | 处理 |
|------|------|
| IAM 用了 `pnpm start:dev` | 改用 `pnpm start:dev:nginx` 或 `pnpm dev:nginx` |
| 浏览器已有 IAM 会话 | 会静默登录，不经过 4180；先清 `api.iam.local` 的 Cookie 再试 |
| hosts / nginx 未生效 | 确认 `admin.iam.local` 能打开且反代到 8848 |

### 已有 IAM 会话时

第二个应用（flow/admin）会 **静默 SSO**，不会打开 `login.iam.local`，这是预期行为。
