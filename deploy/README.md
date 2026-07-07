# 本地 Nginx 上线模拟

通过子域反代宿主机 dev 服务，模拟 `doc/nginx-部署.md` 中的生产拓扑。

## 1. hosts（需管理员权限）

编辑 `C:\Windows\System32\drivers\etc\hosts`，追加：

```text
127.0.0.1 login.pinshuai.local
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

**重要：** 访问 `*.pinshuai.local` 时，IAM 必须用 **nginx 环境** 启动，否则 SSO 会跳到 `localhost:4180` 而不是 `login.pinshuai.local`。

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
OIDC issuer=http://api.pinshuai.local/oidc, IAM_LOGIN_URL=http://login.pinshuai.local
```

若显示 `IAM_LOGIN_URL=http://localhost:4180`，说明用错了启动命令。

## 4. 更新 OAuth redirect_uri（首次或切换模式后）

```powershell
cd IAM-Platform
pnpm seed:oauth-iam-admin
pnpm seed:oauth-flow-admin
```

## 5. 访问地址

| 地址                     | 说明       |
| ------------------------ | ---------- |
| http://admin.pinshuai.local   | iam-admin  |
| http://flow.pinshuai.local    | flow-admin |
| http://login.pinshuai.local   | 统一登录   |
| http://api.pinshuai.local/api | IAM API    |

`public/config.js` 会根据 `*.pinshuai.local` 自动切换 OIDC 配置，直连 `localhost:8848/8849` 仍可用。

## 6. 停止 Nginx

```powershell
docker compose -f docker-compose.nginx.yaml down
```

## 7. 故障排查

### admin.pinshuai.local 502 / 域名访问不了，但 localhost:8848 正常

| 原因 | 处理 |
| ---- | ---- |
| iam-admin 未启动 | `pnpm dev:nginx` 或 `cd apps/iam-admin && pnpm dev`，确认 8848 在监听 |
| Docker 连不上宿主机 | `docker exec iam-nginx wget -S -O- --header "Host: admin.pinshuai.local" http://host.docker.internal:8848`，应返回 200 |
| Nginx 未 reload | `docker compose -f deploy/docker-compose.nginx.yaml up -d` 重建容器 |
| 代理/VPN（Clash TUN 等）劫持 | 将 `*.pinshuai.local` 加入直连/绕过列表，或临时关闭 TUN 模式 |

**容器内自测命令（两条分开执行）：**

```powershell
docker exec iam-nginx wget -S -O- --header "Host: admin.pinshuai.local" http://host.docker.internal:8848
docker logs iam-nginx --tail 20
```

### 访问 admin.pinshuai.local 没有跳到 login.pinshuai.local

| 原因                      | 处理                                                         |
| ------------------------- | ------------------------------------------------------------ |
| IAM 用了 `pnpm start:dev` | 改用 `pnpm start:dev:nginx` 或 `pnpm dev:nginx`              |
| 浏览器已有 IAM 会话       | 会静默登录，不经过 4180；先清 `api.pinshuai.local` 的 Cookie 再试 |
| hosts / nginx 未生效      | 确认 `admin.pinshuai.local` 能打开且反代到 8848                   |

### 已有 IAM 会话时

第二个应用（flow/admin）会 **静默 SSO**，不会打开 `login.pinshuai.local`，这是预期行为。
