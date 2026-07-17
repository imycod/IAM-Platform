# Session expiration handling
_Exported on 7/17/2026 at 09:21:56 GMT+8 from Cursor (3.8.11)_

---

**User**

当session 过期 或者 token 过期 或者 我在会话管理 清除所有账号的会话时， 那么前端需要捕获这个特殊的错误，然后直接提示错误信息，然后退出到登录页

---

**Cursor**

正在查找前后端如何处理会话/令牌过期及会话清除，以便实现统一的前端错误捕获与跳转登录。


实现后端 `AUTH_SESSION_TERMINATED` 错误码，并在 iam-admin 与 flow-admin 的 HTTP 拦截器中统一捕获、提示并跳转登录。


已实现「会话/令牌失效」的统一识别与前端退出流程，覆盖 **iam-admin** 与 **flow-admin**。

## 约定

IAM 在会话过期、访问令牌过期、或被会话管理踢下线时，返回 **HTTP 401**，响应体包含：

- `errorCode`: `AUTH_SESSION_TERMINATED`
- `message`: 可直接展示的中文说明（如「访问令牌已过期，请重新登录」「登录会话已失效，请重新登录」）

## 后端（IAM）

- 新增 `createAuthSessionTerminatedException`（`libs/common/src/auth/auth-session.error.ts`）
- 全局异常过滤器会透传 `errorCode`
- 在 `PortalOrOidcGuard`、`OidcBearerGuard`、`SessionBearerGuard` 及 `AuthService.assertPortalSession` 中，对上述场景抛出该错误

## 前端（iam-admin / flow-admin）

- 新增 `utils/auth-session-terminated.ts`：解析 `errorCode === AUTH_SESSION_TERMINATED`
- HTTP 响应拦截器：提示 `message` → `skipAutoSso()`（避免 IdP 仍有 cookie 时静默又登回去）→ `logOutLocal()` 跳转登录页
- 无感刷新失败时同样处理

## flow-admin 后端

- IAM 401 会带上 `errorCode` / `message` 转发给前端（权限、data-filters 等路径）

---

**验证建议**：重启 IAM（`localhost:3000`）后，在已登录状态下在会话管理里清除当前用户会话，或等令牌过期，再点任意需鉴权的菜单；应看到错误提示并回到登录页。

若 SSO 场景下仍自动跳回已登录态，说明 IdP 浏览器会话还在，这是预期（本地 token 已清）；需要完全退出 IdP 时使用全局登出。

---

**User**

flow-admin 错误会重复谈

---

**Cursor**

排查 flow-admin 中错误提示重复弹出的原因。


修复并发 401 的竞态，并避免拦截器与页面 `catch` 重复弹窗。


重复弹窗主要有两个原因：

1. **并发 401**：多个接口同时失败，拦截器里原来的 `handling` 标志存在竞态，会多次弹出会话失效提示。  
2. **拦截器 + 页面 `catch`**：拦截器已提示后，各页面的 `catch` 里又用 `message(error?.response?.data?.message …)` 再弹一次。

## 修改说明

**`auth-session-terminated.ts`**
- 使用 `sessionLogoutCommitted`，只处理一次退出流程  
- 在 `reject` 前同步给错误打上 `authSessionTerminated` 标记  
- 弹出前调用 `closeAllMessage()`，并开启 `grouping`

**`message.ts`**
- 新增 `messageApiError()`：若是会话失效错误则不再弹窗  

**各业务页**（tiktok / tasks / products / plan 等）
- 接口失败改用 `messageApiError(error, "…")`，避免与拦截器重复  

**HTTP 拦截器**
- 在异步处理前先 `tagAuthSessionTerminatedError`

会话被踢或令牌失效时，现在应只出现 **一条** 错误提示，然后跳转登录页。若还有重复，说明是哪个页面、哪次操作，我可以继续查。

---

**User**

会话管理 会话中心 张密登录时 是怎么记录 应用/客户端的， 我发现flow-admin 账号密码登录时 应用客户端被记录错了

---

**Cursor**

追踪账密登录时会话如何写入会话中心，以及 flow-admin 的应用/客户端字段为何记录错误。


定位到原因：账密登录虽用 `appCode` 做权限校验，但 `session` 表未保存应用，会话中心对所有账密会话硬编码为 `iam-admin`。正在修复：在创建会话时写入 `applicationId`，并在会话中心按该字段展示。


## 账密登录在会话中心是怎么记录的

会话中心（`SessionRegistryService`）聚合两类数据：

| 类型 | 数据来源 | 应用/客户端 |
|------|----------|-------------|
| **OIDC SSO / 访问令牌** | `oidc_payload` | 来自 OAuth `clientId`，再映射到应用的 `name` / `code` |
| **账密门户** | `session` 表 | 应在创建会话时写入所属应用 |

账密走 `POST /api/portal/login`，body 里带 `appCode`（flow-admin 在 `api/user.ts` 里写死为 `flow-admin`）。后端用 `appCode` 做 **application_user 校验** 和返回权限，但之前 **`AuthService.login` 建 session 时没有保存应用**，会话中心又对全部账密会话写死了：

```66:67:iam-platform/apps/iam/src/modules/identity/session/services/session-registry.service.ts
          clientName: '账密门户',
          applicationCode: 'iam-admin',
```

所以 flow-admin 账密登录在会话中心也会显示成 **iam-admin**，这是展示逻辑 bug，不是 flow-admin 传错 `appCode`（当前已传 `flow-admin`）。

## 已做修复

1. **`session.application_id`**：迁移 `1783000000008-AddSessionApplicationId.ts`
2. **登录时写入**：`portal.controller` 把 `applicationId: app.id` 传给 `authService.login`
3. **会话中心展示**：按 `application_id` 查应用，显示真实 `name` / `code`；历史无该字段的会话仍显示「账密门户」且 `applicationCode` 为空

部署后请执行数据库迁移，例如：

```bash
cd iam-platform/apps/iam && pnpm migration:run
```

然后 **重新账密登录 flow-admin**，新会话应显示类似「流程管理（flow-admin）」（具体名称以 seed 里应用 `name` 为准）。旧会话不会自动改应用，需要重新登录或踢下线后再登。

---

**User**

会话管理能加一个是否活跃 或者是否下线吗？ 就是 活跃 绿点  不活跃 下线 红点

---

**Cursor**

查看会话中心的数据结构与列表展示，以便添加活跃/下线状态。


在后端计算 `active` 字段，并在会话中心表格用绿/红点展示。


已在 **会话中心**（`identity/session`）增加「状态」列：

## 规则

| 展示 | 条件 |
|------|------|
| 绿点 + **活跃** | 服务端仍存在，且 `expiresAt` 为空或未过期 |
| 红点 + **已下线** | 已过期（账密会话仍留在库里但未清理时会出现） |

被「踢下线」的会话会从列表消失，不再占一行。

## 改动

- **后端** `UnifiedSessionItem` 增加 `active`（按过期时间计算）
- **前端** 状态列 + 样式；对已下线行禁用「踢下线」按钮

重启 IAM 后刷新会话中心即可看到。若还希望在 **身份认证 → 活跃会话** 里也加同样状态，可以说一下我一起改。

