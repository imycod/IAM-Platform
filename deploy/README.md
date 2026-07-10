# 本地 Nginx 上线模拟

> 完整架构方案与改动记录见 [doc/SSO-授权服务器重构.md](../doc/SSO-授权服务器重构.md)。

通过子域反代宿主机 dev 服务，模拟 `doc/nginx-部署.md` 中的生产拓扑。

架构：`auth.pinshuai.local` 是专用授权服务器源（对标 accounts.google.com），
同源承载 `/oidc`、`/api/interaction` 以及登录/consent UI；业务 API 留在 `api.pinshuai.local`。

## 1. hosts（需管理员权限）

编辑 `C:\Windows\System32\drivers\etc\hosts`，追加：

```text
127.0.0.1 auth.pinshuai.local
127.0.0.1 api.pinshuai.local
127.0.0.1 admin.pinshuai.local
127.0.0.1 flow.pinshuai.local
```

## 2. 启动基础设施

```powershell
# MySQL + Redis
cd IAM-Platform
docker compose up -d

# Nginx 网关（在项目根目录或 deploy 目录均可）
docker compose -f deploy/docker-compose.nginx.yaml up -d
```

## 3. 启动应用（宿主机）

**重要：** 访问 `*.pinshuai.local` 时，IAM 必须用 **nginx 环境** 启动（`OIDC_ISSUER=http://auth.pinshuai.local/oidc`），否则 issuer 会指向 `localhost`。

```powershell
# 推荐：一键启动（IAM nginx 模式 + iam-admin；登录 UI 由后端同源渲染，无需单独起 :4180）
cd IAM-Platform
pnpm dev:nginx

# 或手动分终端：
# 终端 1 - IAM（必须是 start:dev:nginx，不是 start:dev）
pnpm start:dev:nginx

# 终端 2
cd apps/iam-admin && pnpm dev
```

启动后 IAM 日志应显示：

```text
OIDC issuer=http://auth.pinshuai.local/oidc（登录/consent UI 同源托管于 http://auth.pinshuai.local/api/interaction/:uid）
```

## 4. 更新 OAuth client（首次或切换模式后）

会同时更新 redirect_uri 与 consentMode（iam-admin=never、flow-admin=first_time）：

```powershell
cd IAM-Platform
pnpm seed:oauth-iam-admin
pnpm seed:oauth-flow-admin
```

## 5. 访问地址

| 地址                          | 说明                          |
| ----------------------------- | ----------------------------- |
| http://admin.pinshuai.local   | iam-admin                     |
| http://flow.pinshuai.local    | flow-admin                    |
| http://auth.pinshuai.local    | 统一授权服务器 + 登录/consent |
| http://api.pinshuai.local/api | IAM 业务 API                  |

`public/config.js` 会根据 `*.pinshuai.local` 自动切换：oidcIssuer→auth 源，业务 API→api 源；直连 `localhost:8848/8849` 仍可用（此时 issuer=localhost:3000）。

## 6. 停止 Nginx

```powershell
docker compose -f docker-compose.nginx.yaml down
```

## 7. 故障排查

### admin.pinshuai.local 502 / 域名访问不了，但 localhost:8848 正常

**最常见原因：本机代理（Clash / V2Ray 等）劫持了 `*.pinshuai.local`。**

`localhost` 通常在代理绕过列表里会直连；自定义域名 `*.pinshuai.local` 若未加入绕过，请求会走 `127.0.0.1:7890` 等本地代理端口，代理无法正确转发到 Docker Nginx → **502**。

验证（PowerShell，无代理时应返回 JSON）：

```powershell
$wc = New-Object System.Net.WebClient
$wc.Proxy = $null
$wc.DownloadString("http://auth.pinshuai.local/api/interaction/sso/status")
```

处理：在 Clash / 系统代理的 **绕过 / DIRECT** 列表加入：

```text
*.pinshuai.local
pinshuai.local
127.0.0.1
localhost
```

或临时关闭 TUN 模式后再访问。

| 其它原因 | 处理 |
| ---- | ---- |
| iam-admin 未启动 | `pnpm dev:nginx` 或 `cd apps/iam-admin && pnpm dev`，确认 8848 在监听 |
| IAM 未用 nginx 环境 | 必须用 `pnpm start:dev:nginx`（日志 issuer 应为 `auth.pinshuai.local`） |
| Docker 连不上宿主机（IPv6） | 已用 `resolver ipv6=off` 修复；可 `docker exec iam-nginx nginx -s reload` |
| 旧 cookie 干扰登录 | 浏览器清除 `*.pinshuai.local` 全部 cookie 后重试 |
| Nginx 未 reload | `docker compose -f deploy/docker-compose.nginx.yaml up -d` 重建容器 |

### 登录后其它应用的 SSO

已有 IAM 会话时，第二个应用会 **静默 SSO**：`iam-admin`(never) 直接进入；`flow-admin`(first_time) 首次弹授权确认页，同意后进入、以后复用。

### 多 tab 都停在登录页

在任一 tab 完成登录后，其它停在 `auth.pinshuai.local` 登录页的 tab 会自动探测到 SSO 会话并续登（consent 或直接进入）。
