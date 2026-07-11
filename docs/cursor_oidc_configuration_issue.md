# OIDC configuration issue
_Exported on 7/11/2026 at 18:53:37 GMT+8 from Cursor (3.8.11)_

---

**User**

@iam-platform  http://localhost:3000/oidc  http://localhost:3000 可以配置吗  http://192.168.50.100:9446/#/login  我已经把服务部署到 NAS -> Portainer -> docker 里了 也可以前端后端都跑通了  就是 访问这个 会跳转到 localhost

---

**Cursor**

访问被重定向到 `localhost` 通常是 OIDC 或前端基础 URL 配置问题。正在查看 `iam-platform` 中的相关配置。


可以配置，而且**必须改**。你现在访问 `http://192.168.50.100:9446` 却跳到 `localhost`，是因为项目默认只认两种环境：

1. **localhost 开发** → `http://localhost:3000/oidc`
2. **pinshuai.local 子域** → `http://auth.pinshuai.local/oidc`

用 NAS 的局域网 IP 访问时，前端仍会走 localhost 分支。

---

## 原因（3 处要一起改）

| 位置 | 当前值 | 影响 |
|------|--------|------|
| 后端 `.env.docker` | `OIDC_ISSUER=http://localhost:3000/oidc` | 授权服务器 issuer、登录页跳转地址 |
| 前端 `config.js` / `oidc.ts` | 非 pinshuai.local 就用 localhost | 登录时跳到 `localhost:3000/oidc/auth` |
| 数据库 `oauth_client.redirect_uris` | 只有 localhost / pinshuai.local | 即使改对了，回调也可能被拒 |

---

## 推荐方案：单端口（只暴露 9446）

admin 的 Nginx 已经反代了 `/api/`，建议**再加 `/oidc/` 反代**，这样浏览器只访问一个地址，避免跨域问题。

### 1. 修改 `deploy/nginx/admin.conf`（加一段）

```nginx
location /oidc/ {
    proxy_pass http://iam:3000/oidc/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. 在 Portainer 里改 IAM 容器环境变量

```env
APP_URL=http://192.168.50.100:9446
BETTER_AUTH_URL=http://192.168.50.100:9446
OIDC_ISSUER=http://192.168.50.100:9446/oidc
```

改完后**重启 iam 容器**。

### 3. 修改前端 `apps/iam-admin/public/config.js`

把 else 分支改成用你的 NAS 地址：

```javascript
window.IAM_CLIENT_CONFIG = nginx
  ? { /* pinshuai.local 不变 */ }
  : {
      iamBaseUrl: "http://192.168.50.100:9446",
      oidcIssuer: "http://192.168.50.100:9446/oidc",
      clientId: "iam-admin-spa",
      scopes: "openid profile email",
      appCode: "iam-admin"
    };
```

同时建议在 `index.html` 里、`main.ts` 之前加上：

```html
<script src="/config.js"></script>
```

否则主应用登录页走的是打包进 JS 的 `oidc.ts`，仍会默认 localhost。

### 4. 更新数据库 redirect_uri

在 MySQL 里给 `iam-admin-spa` 加上回调地址：

```sql
UPDATE oauth_client
SET redirect_uris = JSON_ARRAY_APPEND(
  redirect_uris,
  '$',
  'http://192.168.50.100:9446/callback.html'
)
WHERE client_id = 'iam-admin-spa';
```

或在 iam 容器里执行：

```bash
pnpm seed:oauth-iam-admin
```

（需要先改 seed 里的 redirect 列表，或手动 SQL。）

### 5. 重新构建并部署 admin 容器

```bash
docker compose --env-file .env.docker up -d --build admin
```

---

## 双端口方案（IAM 单独映射一个端口）

如果 IAM 映射为 `192.168.50.100:9445`，admin 为 `9446`：

| 配置项 | 值 |
|--------|-----|
| `OIDC_ISSUER` | `http://192.168.50.100:9445/oidc` |
| `APP_URL` | `http://192.168.50.100:9445` |
| 前端 `iamBaseUrl` | `http://192.168.50.100:9446`（走 admin 的 `/api` 反代） |
| 前端 `oidcIssuer` | `http://192.168.50.100:9445/oidc` |
| `redirect_uri` | `http://192.168.50.100:9446/callback.html` |

注意：`callback.html` 换 token 时会跨域请求 IAM，需要在后端 CORS 里允许 `http://192.168.50.100:9446`，所以更推荐上面的**单端口方案**。

---

## 验证步骤

1. 打开 `http://192.168.50.100:9446/#/login`
2. 点登录后，地址栏应变成类似：
   `http://192.168.50.100:9446/oidc/auth?...`
   **不能**再出现 `localhost`
3. 登录成功后应回到 `http://192.168.50.100:9446/callback.html?code=...`

---

## 小结

- `http://localhost:3000` 和 `http://localhost:3000/oidc` **只适合本机开发**，NAS 上不能继续用。
- 部署到 NAS 时，要把这三处统一成你实际访问的地址：`OIDC_ISSUER`、前端 `config.js`、数据库 `redirect_uris`。
- 最省事的是：**admin 反代 `/oidc` + 全部用 `192.168.50.100:9446`**。

如果你愿意，我可以直接帮你在仓库里改好 `admin.conf`、`config.js`、`index.html`，做成按当前访问地址自动适配（不用每次手写 IP）。

