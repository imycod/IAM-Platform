# Session management records
_Exported on 7/17/2026 at 12:22:18 GMT+8 from Cursor (3.8.11)_

---

**User**

会话管理 账号密码登录 有记录 这是对的 但是退出为什么没有记录 或者说 为什么没有把之前记录删除？

---

**Cursor**

正在分析会话管理中登录与退出登录的记录逻辑。




这是**当前实现的设计缺口**，不是会话中心展示错了。

## 现象对应的两套数据

| 能力 | 登录时 | 点「退出」时 |
|------|--------|--------------|
| **登录审计**（`login_history`） | 账密登录会写一条成功记录 | **不会**写「登出」记录（表只设计为登录尝试审计） |
| **会话中心**（`session` 表） | `authService.login` 插入一条门户 session | **服务端 session 通常还在**，直到 TTL 过期或被管理员踢下线 |

登录有记录是对的；退出后列表里仍能看到那条 session，是因为**退出没有通知 IAM 吊销 session**。

## 根因：前端「退出」只清本地，不调后端

账密登录成功后，`refreshToken` 实际就是门户 session token（与 `accessToken` 相同）：

```127:128:c:\Users\Administrator\Desktop\workspace\iam-platform\apps\iam\src\modules\access\user-context\portal.controller.ts
    const data = await this.buildPortalUserData(result.user.id, app, result.token, result.token);
    return { success: true, data: { ...data, expires: result.expiresAt } };
```

但 `logOutLocal` 在 **SSO** 时会调 `revokeCurrentOidcAccessToken` → `/api/auth/oidc-local-logout`；**账密**分支没有对称逻辑，只清 Cookie / localStorage 并跳转登录页：

```95:110:c:\Users\Administrator\Desktop\workspace\iam-platform\apps\iam-admin\src\store\modules\user.ts
    async logOutLocal() {
      if (isSsoSession()) {
        await revokeCurrentOidcAccessToken();
      }
      skipAutoSso();
      clearLoginMethod();
      // ... 清本地状态 ...
      router.push("/login");
    },
```

后端其实已有吊销能力：`POST /api/auth/logout` 会对 session 做 `softDelete`（从会话列表里消失）：

```221:226:c:\Users\Administrator\Desktop\workspace\iam-platform\apps\iam\src\modules\identity\auth\services\auth.service.ts
  async logout(token: string): Promise<void> {
    const session = await this.sessionService.findByToken(token);
    if (session) {
      await this.sessionService.revoke(session.id);
    }
  }
```

门户侧没有 `/api/portal/logout`，前端也**从未**在账密退出时带上 token 调上述接口。

## 会话中心为何仍显示「活跃」

列表里的 `active` 主要看 **`expiresAt` 是否未过期**，不会根据「用户是否已在浏览器点退出」判断：

```215:219:c:\Users\Administrator\Desktop\workspace\iam-platform\apps\iam\src\modules\identity\session\services\session-registry.service.ts
  private isSessionActive(expiresAt: Date | null): boolean {
    if (!expiresAt) {
      return true;
    }
    return expiresAt.getTime() > Date.now();
  }
```

本地退出后 DB 里 session 仍在且未过期 → 会话中心仍显示为活跃，直到策略 TTL 到期或管理员「踢下线」。

## 直接回答你的两个问题

1. **为什么没有退出记录？**  
   - 若指**登录审计**：系统只记录登录成功/失败，**没有登出审计**（`LoginHistoryEntity` 注释即为登录审计）。  
   - 若指**会话中心**：本来也不是「再插一条退出记录」，而是**吊销/软删**原 session；这一步账密退出没做。

2. **为什么没有删掉之前的记录？**  
   因为账密退出**没有调用** `authService.logout`，服务端 session 一直保留。

## 若要行为一致，建议方向

1. 在 `logOutLocal` 里：当 `getLoginMethod() === "password"` 时，用当前 `refreshToken`/`accessToken` 调后端 logout（可新增 `POST /api/portal/logout` 与 login 对称，或直接调现有 `/api/auth/logout`）。  
2. （可选）若产品需要「登出审计」，需单独扩展模型/接口；与「会话中心删记录」是两件不同的事。

如果你希望，我可以在 `iam-admin`（以及需要对齐的 `flow-admin`）里补上账密退出时吊销 session 的具体改动。

---

**User**

可以增加上这个接口，会有问题吗，如果增加了这个接口后，前端是不是直接退出完  就直接跳到了 sso 统一登录页了？ 还是说退出会到 自己的登录页 然后用户手动可以选择 账密登录 还是 sso登录

---

**Cursor**

分析退出后的路由与 SSO 自动跳转逻辑，以便准确回答。




## 加退出接口会不会有问题？

**一般可以安全加**，和 SSO 本地退出里已有的 `oidc-local-logout` 是同一类做法：退出前用当前 token 通知 IAM **吊销服务端账密 session**（`softDelete`），本地照旧清 Cookie / localStorage。

需要注意的点：

| 点 | 说明 |
|----|------|
| **调用顺序** | 必须在 `removeToken()` **之前**带上 `refreshToken`（账密下它就是门户 session token）调接口，否则没法吊销 |
| **失败策略** | 网络/超时失败应 **仍完成本地退出**（和 `revokeCurrentOidcAccessToken` 一样 `try/catch` 忽略），避免用户卡在退出 |
| **作用范围** | 只删 **本应用的账密 session 行**，**不会**销毁 IdP 上的 OIDC SSO 会话（和现有「本地退出、保留统一登录」一致） |
| **安全** | 谁持有 token 谁就能吊销该 session，和「已登录态可被滥用」同级；不必为此单独改 SSO 跳转逻辑 |

不会因为是「多了一个接口」就改变登录页路由策略；真正决定跳哪儿的是 **`skipAutoSso` + 登录页 `useSsoLoginPage`**，和今天一样。

---

## 退出后会跳到 SSO 统一登录页，还是本应用登录页？

**主动点「退出」后：仍然是本应用 `/login`，不会自动跳进 IdP 统一登录页。**

原因在现有代码里已经写死了：

1. `logOutLocal()` 里会先执行 **`skipAutoSso()`**（在 `router.push("/login")` 之前）。
2. 登录页挂载时，若 `shouldAutoSso()` 为 false（已 skip），**不会**走 `beginAuthorize`，而是停在 **`phase = "ready"`**，展示本页 UI。

注释也说明了这一点：「本地退出后 `skipAutoSso` 阻止自动续登；手动点击 SSO 走交互式授权。」

因此登录页上用户仍可以：

- **账密登录**（表单 +「账密登录」）
- **SSO 登录**（点「SSO 登录（IAM 统一认证）」才会 `clearSkipAutoSso()` 并跳 IdP）

**补上 portal logout 只多一步服务端吊销 session，不会去掉 `skipAutoSso()`，也不会改成自动 SSO。**

---

## 和「自动 SSO」的区别（避免混淆）

| 场景 | 行为 |
|------|------|
| **用户主动退出** → `/login` | `skipAutoSso` 已设置 → **留在 iam-admin 登录页**，手动选账密或 SSO |
| **直接打开登录页且未 skip**（例如新标签、从未在本 tab 退出过） | `shouldAutoSso()` 为 true → **可能自动** `beginAuthorize` 跳到 IAM `/oidc/auth`（有 IdP 会话则很快回跳） |
| **`logOutGlobal()`**（全局退出，默认菜单不用） | 走 RP-Initiated Logout → IdP `session/end`，和「本地退出 + portal logout」不是一条路径 |

---

## 小结

- **可以加** `POST /api/portal/logout`（或账密退出时调现有 `/api/auth/logout`），主要修复 **会话中心仍显示活跃 session** 的问题。
- **不会**因为加了接口就让「退出完自动进 SSO 统一登录页」；主动退出仍是 **本应用登录页 + 账密 / SSO 二选一**。
- 若用户之后 **手动点 SSO**，IdP 若还有 SSO cookie，仍可能较快再登进去——这是「只吊销门户 session、不毁 IdP SSO」的设计，不是 portal logout 新引入的。

如果你要落地实现，建议在 `logOutLocal` 里对 `getLoginMethod() === "password"` 增加与 SSO 对称的吊销调用，并优先用 `/api/portal/logout` 与 login 保持一致。需要的话我可以直接改 `iam-admin` / `flow-admin` 和后端。

---

**User**

可以

---

**Cursor**

正在实现账密退出的 portal logout 接口，并在 iam-admin 与 flow-admin 前端接入。




已接上账密退出的服务端吊销，行为与 SSO 的 `oidc-local-logout` 对称。

### 后端（iam-platform）
- 新增 **`POST /api/portal/logout`**，请求体：`{ refreshToken, appCode? }`，内部调用 `authService.logout`（对 `session` 做 softDelete）。
- DTO：`apps/iam/src/modules/access/user-context/dto/portal-logout.dto.ts`

### 前端（iam-admin + flow-admin）
- 新增 **`revokeCurrentPortalSession(refreshToken)`**（`fetch` 调 portal logout，失败不阻塞退出）。
- **`logOutLocal`**：在清本地 token **之前**  
  - SSO → 仍走 `revokeCurrentOidcAccessToken`  
  - 账密 → 走 `revokeCurrentPortalSession(getToken().refreshToken)`  
  - 仍会 **`skipAutoSso()`**，再跳 **`/login`**（本应用登录页，可选手动账密或 SSO）。

### 自测建议
1. 账密登录 → 会话中心有一条活跃 session  
2. 点退出 → 回到本应用登录页（不会自动跳 IdP）  
3. 刷新会话中心 → 该条 session 应消失  

会话被踢/过期触发的 `logOutLocal` 也会尝试吊销，服务端已删则相当于 no-op，不影响本地清态。

---

**User**

可以在前端登录历史处增加一些字段吗，比如 client 登录了哪些客户端

---

**Cursor**

查看登录历史的前后端数据模型与展示页面。




正在扩展数据库与登录写入逻辑，并在登录历史页展示客户端/应用信息。




已为登录历史增加「登录了哪个应用 / 哪个 OIDC 客户端」的存储与展示。

### 后端
- **迁移** `1783000000010-AddLoginHistoryClientContext.ts`：在 `login_history` 增加  
  `client_id`、`application_id`、`application_code`、`application_name`
- **账密登录**（`/api/portal/login`）：写入对应应用的 code、name
- **SSO 登录**（OIDC 授权成功）：根据 `client_id` 解析 OAuth 客户端并写入应用信息 + `clientId`

### 前端（登录历史页）
- 表格列：**应用**、**OIDC Client**；登录类型显示为「账密 / SSO」等
- 筛选：**应用 code**、**Client ID**（服务端精确匹配）
- 手动增改记录表单中可填上述字段

### 说明
- **历史数据**在迁移前没有这些字段，会显示为 `-`；**新登录**开始会有值。
- 账密登录一般只有「应用」，**OIDC Client** 多为 SSO 时有值（如 `iam-admin-spa`）。

部署后请执行数据库迁移，例如：

```bash
pnpm --filter @app/iam migration:run
```

（以你项目里实际的 migration 命令为准。）

---

**User**

增加一键删除 登录历史按钮

---

**Cursor**

已加上「一键清空」能力，与会话中心的批量操作方式一致。

### 后端
- **`DELETE /api/login-histories/all`**：按查询条件批量软删除  
  - 支持：`userId`、`success`、`applicationCode`、`clientId`  
  - **未带任何条件时**：清空全部登录历史  
  - 返回：`{ deleted: number }`

### 前端（登录历史页）
- 工具栏增加 **「一键清空」**（红色描边按钮）  
- 二次确认文案会说明当前筛选范围；若只填了「标识」，会提示标识仅影响列表展示，批量删除不按标识过滤  

使用说明：先设好筛选再点「一键清空」，只删符合条件的数据；要删全库记录则清空所有筛选项后再点。

---

**User**

{
    "code": 500,
    "message": "Internal server error",
    "data": null,
    "path": "/api/login-histories/all",
    "timestamp": "2026-07-17T04:04:33.886Z"
}

---

**Cursor**

正在排查 `DELETE /api/login-histories/all` 返回 500 的原因。




定位到原因：TypeORM 禁止对空条件调用 `softDelete({})`，无筛选的一键清空会触发该错误。正在修复。




**原因**：在未设置任何筛选条件时，后端会执行 `repository.softDelete({})`。TypeORM 不允许空条件软删，会抛出 `Empty criteria(s) are not allowed for the softDelete method`，最终变成 500。

**修复**：有条件时仍用 `softDelete(where)`；**无条件**（清空全部）时改用 `createQueryBuilder().softDelete().execute()` 删除整张表内未软删的记录。

请重启 IAM 服务后再试「一键清空」。若仍报错，把服务端控制台里的堆栈贴出来即可。

---

**User**

OIDC Client 流程管理平台 这个字段是在哪里记录的 没有记录

---

**Cursor**

追踪登录历史中「OIDC Client」与「应用」字段的写入路径，并核对 flow-admin（流程管理平台）场景。




说明字段含义，并在账密登录时通过应用关联写入对应的 OAuth `client_id`（例如 `flow-admin-spa`）。




先分清登录历史里两列的含义，它们不是同一字段。

## 两列分别是什么

| 列名 | 库表字段 | 含义 | 典型值（flow-admin） |
|------|----------|------|----------------------|
| **应用** | `application_name` / `application_code` | 业务系统（seed 里的应用） | **流程管理平台（flow-admin）** |
| **客户端 ID** | `client_id` | OIDC 注册的 SPA 客户端 | **flow-admin-spa**（仅 SSO 或已关联 OAuth 客户端时） |

「流程管理平台」是应用在 `pnpm seed:flow-admin` 里写入的 `application.name`，应出现在 **应用** 列，不会出现在 OIDC Client 列。

---

## 在哪里写入

**1. flow-admin 账密登录**（登录页 → `POST /api/portal/login`，`appCode: flow-admin`）

- 入口：`portal.controller.ts` → `authService.login`
- 写入：`LoginHistoryService.record`（`auth.service.ts` 的 `recordLoginAttempt`）
- **应用**：`applicationId / applicationCode / applicationName`（来自 `resolveApp('flow-admin')`）
- **客户端 ID**：原先账密不写 `client_id`，所以 **客户端 ID 列为空**（这是设计缺口，不是 flow-admin 传错）

**2. flow-admin SSO 登录**（点 SSO → OIDC 授权成功）

- 入口：`oidc.service.ts` 监听 `authorization.success` → `recordSsoAuthorizationSuccess`
- **客户端 ID**：`ctx.oidc.client.clientId`（应为 `flow-admin-spa`）
- **应用**：用 `client_id` 查 `oauth_client`，再查 `application` 得到「流程管理平台 / flow-admin」

SSO 不会在 `portal/login` 里记登录历史；账密也不会走 `authorization.success`。

---

## 为什么你看到「没记录」

常见几种情况：

1. **库表还没迁移**  
   字段在迁移 `1783000000010-AddLoginHistoryClientContext.ts` 里。未执行时，写入可能失败（`recordLoginAttempt` 内部 catch 掉），表现为 **应用 / 客户端 ID 都空**，或只有老字段有数据。

2. **看的是旧数据**  
   加字段之前的登录记录不会有应用和 client。

3. **账密登录却看「客户端 ID」**  
   改代码之前，账密本来就不会填 `client_id`，客户端 ID 列会是 `-`。

4. **和「会话中心」混淆**  
   会话中心看的是 `session` 表；登录历史看的是 `login_history` 表，写入路径不同。

---

## 已做的小改进

- **账密登录**：在 `portal/login` 里按 `applicationId` 查 OAuth 客户端，若存在（如已 `seed:oauth-flow-admin`），会把 **`flow-admin-spa` 写入 `client_id`**。
- 前端：列名改为 **「客户端 ID」**；账密且仍无 client 时显示「—（账密，无 OIDC）」。

请确认：

1. 已跑迁移 `1783000000010`  
2. 已跑 `pnpm seed:oauth-flow-admin`（才有 `flow-admin-spa`）  
3. **重新登录一次** flow-admin 后再看登录历史  

新记录应类似：**应用** = 流程管理平台（flow-admin），**客户端 ID** = flow-admin-spa（账密/SSO 在 seed 齐全时均可有值）。

---

**User**

失败原因 我用一个没有 应用权限的 account 登录 失败原因没记录

---

**Cursor**

追踪无应用权限账号登录时的失败路径及登录审计写入点。




定位到问题：账密校验通过后已写入成功审计并创建 session，应用权限在之后的 `assertUserCanAccess` 才失败，且该异常未被记入登录历史。将改为先校验应用权限，再签发 session，并统一记录失败原因。




**原因**

`POST /api/portal/login` 原来的顺序是：

1. `authService.login`：账密正确 → **已写成功审计** + **已建 session**
2. `buildPortalUserData` → `assertUserCanAccess` → 抛出 `ForbiddenException`（403）

权限失败发生在第 2 步，**不会**再走 `login` 里的失败审计；`ForbiddenException` 也不是 `UnauthorizedException`，所以 **失败原因不会写入 `login_history`**。有时还会留下一条错误的「成功」记录和无效 session。

**修复**

1. **门户账密登录**：先 `verifyCredentials` → 再 `assertUserCanAccess` → 通过后才 `completePortalLogin`（建 session + 记成功）。
2. 任意一步失败时调用 **`recordLoginFailure`**，写入 `failReason`（例如：`无权访问该应用，请联系管理员开通 application_user`），并带上 `userId`（账密已对、仅进门被拒时）。

请重启 IAM 后，用无 `application_user` 的账号再登 flow-admin / iam-admin，登录历史应出现 **失败** 及对应失败原因。旧数据不会自动补全。

---

**User**

在前端 把 结果 用tag 显示 成功就是 绿色 失败 红色

---

**Cursor**

已在登录历史列表的 **结果** 列改为 `el-tag` 展示，与会话中心风格一致：

- **成功**：绿色（`type="success"`）
- **失败**：红色（`type="danger"`）

均为 `size="small"`、`effect="plain"`。刷新登录历史页即可看到效果。

---

**User**

01KX03P497WKCFE4SBV6VDNCC4 我用这个 account sso 一个没有权限的应用 结果 登录历史还记录成功了

---

**Cursor**

追踪 SSO 授权成功与 `application_user` 校验的顺序，找出为何无权限仍记为成功。




根因：`authorization.success` 在 OIDC 授权完成时即写入成功，未校验 `application_user`；已有 Grant 时还可能绕过 `finishLogin` 的进门校验。正在在审计写入前校验应用权限，并在 interaction 进门失败时记录失败。




**原因**

SSO 登录历史原先在 OIDC 的 `authorization.success` 里**直接记成功**，没有核对 `application_user`。  
另外，若用户已有该客户端的 **Grant**，授权可能**不再走** interaction 里的 `finishLogin` 进门校验，但仍会触发 `authorization.success`，于是无应用权限也会出现一条「成功」。

**已改**

1. **`authorization.success` 写审计前**：按 `client_id` 解析应用，用 `canUserAccess` 校验；无权限则记 **失败** + 失败原因，且不更新 `lastLoginAt`。
2. **`finishLogin` / `finishConsent` 进门被拒时**：在抛出 403 前补一条 **失败** 审计（interaction 页静默 SSO / 账密后进 IdP 等路径）。

请重启 IAM 后，用账号 `01KX03P497WKCFE4SBV6VDNCC4` 再试 SSO 登录**无权限的应用**；新记录应为红色 **失败**，失败原因类似：`无权访问该应用，请联系管理员开通 application_user`。  
此前误记的「成功」行不会自动改，需要可手动删或一键清空后重测。

