# 本地 Nginx 上线模拟

通过子域反代宿主机 dev 服务，模拟 Google 式 OIDC 拓扑。

## 拓扑（重要）

| 域名                    | 职责                                                        |
| ----------------------- | ----------------------------------------------------------- |
| **auth.pinshuai.local** | **IdP**：登录 UI + `/oidc` + `/api/interaction`（必须同源） |
| api.pinshuai.local      | 业务 API（iam NestJS）                                      |
| admin.pinshuai.local    | iam-admin SPA                                               |
| flow.pinshuai.local     | flow-admin SPA                                              |
| login.pinshuai.local    | 兼容旧书签 → 302 到 auth                                    |

登录页与 OIDC **不能**分到不同域，否则 `_interaction` / SSO Session cookie 会丢或串。

## 1. hosts（需管理员权限）

编辑 `C:\Windows\System32\drivers\etc\hosts`，追加：

```text
127.0.0.1 auth.pinshuai.local
127.0.0.1 login.pinshuai.local
127.0.0.1 api.pinshuai.local
127.0.0.1 admin.pinshuai.local
127.0.0.1 flow.pinshuai.local
```

## 2. 启动基础设施

```powershell
cd IAM-Platform
docker compose up -d
docker compose -f deploy/docker-compose.nginx.yaml up -d
```

改完 `deploy/nginx/conf.d/iam.conf` 后需重建 nginx：

```powershell
docker compose -f deploy/docker-compose.nginx.yaml up -d --force-recreate
```

## 3. 启动应用（宿主机）

```powershell
cd IAM-Platform
pnpm dev:nginx
```

或手动：

```powershell
# 终端 1 - IAM（加载 .env.nginx）
pnpm start:dev:nginx

# 终端 2 - 登录页（同样加载 .env.nginx）
pnpm iam-login:dev:nginx

# 终端 3 - iam-admin（vite --mode nginx）
cd apps/iam-admin && pnpm dev:nginx

# 终端 4 - flow-admin
cd ../flow-admin/frontend && pnpm dev:nginx
```

启动后 IAM 日志应显示：

```text
OIDC issuer=http://auth.pinshuai.local/oidc, IAM_LOGIN_URL=http://auth.pinshuai.local
```

## 4. 环境变量

| 文件               | 用途                           |
| ------------------ | ------------------------------ |
| `.env`             | 共享基础（DB、默认值）         |
| `.env.development` | 本地直连 `localhost`           |
| `.env.nginx`       | 本地子域模拟（与生产拓扑一致） |
| `.env.production`  | **上线**（`pnpm start:prod`）  |

前端 SPA：

| 文件                              | 用途     |
| --------------------------------- | -------- |
| `apps/iam-admin/.env.development` | 本地直连 |
| `apps/iam-admin/.env.nginx`       | 子域模拟 |
| `apps/iam-admin/.env.production`  | 上线构建 |
| `flow-admin/frontend/.env.*`      | 同上     |

上线时改 `.env.production` / 前端 `.env.production` 里的域名为真实域名，并轮换 `OIDC_COOKIE_KEYS`。

## 5. 更新 OAuth redirect_uri（首次或切换模式后）

```powershell
cd IAM-Platform
pnpm seed:oauth-iam-admin
pnpm seed:oauth-flow-admin
```

## 6. 访问地址

| 地址                          | 说明            |
| ----------------------------- | --------------- |
| http://admin.pinshuai.local   | iam-admin       |
| http://flow.pinshuai.local    | flow-admin      |
| http://auth.pinshuai.local    | 统一登录（IdP） |
| http://api.pinshuai.local/api | 业务 API        |

**不要**在 nginx 模式下直接打开 `http://localhost:4180`。  
登录页应走 `http://auth.pinshuai.local`（与 `/oidc`、`_interaction` cookie 同源）。  
从 `admin.pinshuai.local` 点 SSO 会自动跳到 auth；直连 4180 会拿不到正确 cookie，出现 `interaction_expired`。

## 7. 预期 SSO 行为（Google 式）

1. **多客户端同时登录不串**：每个 SPA 有自己的 `client_id` / PKCE / 本地 token；IdP 侧按 Grant 隔离。
2. **客户端本地退出不影响其它客户端**：默认 `logOut()` 只吊销本应用 access_token，保留 IdP SSO Session。
3. **已授信客户端登录后**：另一客户端若 `consentMode=never` → 静默进入；否则 → 到自己的 consent 页。
4. **consent Deny** → 回该客户端自己的 `/#/login?sso_error=access_denied`。

## 8. 故障排查

### 跳到 localhost:4180 而不是 auth

IAM / iam-login 没用 nginx 环境：改用 `pnpm start:dev:nginx` 与 `pnpm iam-login:dev:nginx`。

### 第二个应用没有自动进 / 卡在登录页

| 原因                           | 处理                                                        |
| ------------------------------ | ----------------------------------------------------------- |
| SSO 探测打到了 api 而不是 auth | 确认前端 `VITE_OIDC_ISSUER=http://auth.pinshuai.local/oidc` |
| 浏览器无 auth cookie           | 清 `auth.pinshuai.local` Cookie 再试                        |
| consentMode 非 never           | 应出现 consent 页，点 Allow                                 |

### 本地退出后其它应用也被踢

确认走的是默认「退出」（`logOutLocal`），不是「退出统一登录」（`logOutGlobal` / `/oidc/session/end`）。
