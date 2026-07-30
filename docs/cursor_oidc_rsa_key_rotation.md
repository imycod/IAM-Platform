# OIDC RSA key rotation
_Exported on 7/24/2026 at 16:50:20 GMT+8 from Cursor (3.8.11)_

---

**User**

OIDC RSA 密钥轮换在哪里？ 

---

**Cursor**

我先在代码库里定位 OIDC RSA 密钥轮换相关实现。

**结论：本仓库里没有实现 OIDC RSA 签名密钥轮换。**

OIDC 在 `apps/iam/src/modules/security/oidc/services/oidc.service.ts` 里用 `node-oidc-provider` 初始化，配置里**没有**传入 `jwks` / keystore：

```129:170:apps/iam/src/modules/security/oidc/services/oidc.service.ts
    this.provider = new Provider(issuer, {
      adapter: createOidcAdapter(this.payloadRepo),
      clients,
      // ...
      cookies: {
        keys: cookieKeys,
        long: { sameSite: 'lax' },
        short: { sameSite: 'lax' },
      },
```

因此 JWT/ID Token 的 RSA 密钥由库在进程内自动生成；重启后会变，也没有持久化或轮换逻辑。`oidc_payload` 适配器只存 Session/Token 等协议对象，不存 KeyStore。

和“密钥”最接近的只有 **Cookie 签名密钥**（对称，不是 RSA）：

- 环境变量：`OIDC_COOKIE_KEYS`（逗号分隔，如 `key1,key2`）
- 用法：上述 `cookies.keys`
- 校验：`libs/config/src/env.validation.ts`

若要轮换 Cookie 密钥，可把新密钥放在列表最前面（Keygrip 风格）；这与 JWKS RSA 轮换不是一回事。

若要做正式 RSA 轮换，需要自行扩展（例如配置持久化 `jwks`、多 kid 并存、管理接口/定时任务），当前代码和文档里都没有这部分。

---

**User**

显式配置 JWKS, 生成token时 用私钥加密，然后在客户端做密钥轮转，支持手动配置

---

**Cursor**

先摸清现有 OIDC 签发与客户端验签方式，再接入显式 JWKS 与可手动配置的密钥轮换。

开始实现：服务端显式加载 JWKS 并用私钥签名；提供生成/轮换脚本；客户端按 `kid` 拉取 JWKS 验签以支持轮换。

修复 `reloadJwks` 与 `invalidateProvider` 的交互，并添加客户端 JWKS 验签。

Dockerfile 运行时镜像需要带上 JWKS 生成脚本；回调流程里接入 JWKS 验签。

已接入显式 JWKS：服务端用 RSA 私钥签 ID Token，客户端按 `kid` 拉 `/oidc/jwks` 验签并支持轮换。

### 服务端
- `OidcService` 向 `node-oidc-provider` 传入 `jwks`（`keys[0]` 签发）
- 配置优先级：`OIDC_JWKS` → `OIDC_JWKS_FILE` → 开发环境自动生成 `secrets/oidc-jwks.json`
- 生产未配置会启动失败；Docker 入口会在缺文件时自动生成并挂卷持久化

### 手动配置 / 轮换
```bash
pnpm oidc:jwks:generate   # 生成私钥 JWKS
pnpm oidc:jwks:rotate     # 末尾追加新钥 → 重启（可验、尚未签发）
pnpm oidc:jwks:promote    # 新钥提到首位 → 再重启（开始签发）
pnpm oidc:jwks:public     # 打印公钥 JWKS
```

环境变量：`.env.development` 中 `OIDC_JWKS_FILE=secrets/oidc-jwks.json`

### 客户端
- `apps/iam-admin/public/oidc-jwks.js` + `src/utils/oidc-jwks.ts`
- 换 token 后验 `id_token`；未知 `kid` 会强制刷新 JWKS（轮换友好）

公钥端点：`{OIDC_ISSUER}/jwks`（例如 `http://localhost:3000/oidc/jwks`）

说明：这里是 **RS256 签名**（不是加密）。`access_token` 仍是不透明令牌，由服务端查库校验；JWT 主要是 `id_token`。

---

**User**

 *  Executing task: pnpm run start:iam:debug 


 *  The terminal process failed to launch: Starting directory (cwd) "C:\Users\Administrator\Desktop\workspace\iam-platform\iam-platform" does not exist. 

---

**Cursor**

启动目录多了一层 `iam-platform`，我先检查 `tasks.json` / `launch.json` 里的 cwd 配置。

工作区已是 `iam-platform` 根目录，cwd 不应再拼一层。正在修正 `tasks.json` 和 `launch.json`。

原因：工作区根目录已经是 `iam-platform`，任务却还写了 `${workspaceFolder}/iam-platform`，拼成了不存在的 `...\iam-platform\iam-platform`。

已改成：
- IAM 任务/调试：`cwd` → `${workspaceFolder}`
- flow-admin：`../flow-admin`（兄弟目录）
- 顺带修正 `IAM: Debug (nginx)` 的 `preLaunchTask` 指向实际存在的 `iam: start debug (stage)`

再跑一次 `iam: start debug (development)` 即可。

