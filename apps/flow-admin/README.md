# flow-admin · OIDC SSO 最小演示

纯 HTML + 原生 JS，无 Vue/React。通过标准 **Authorization Code + PKCE** 对接 IAM。

## 前置条件

1. MySQL + IAM 已 migration / seed
2. 已执行：

```bash
pnpm seed:flow-admin
pnpm seed:create-account
pnpm seed:flow-admin-access
pnpm seed:oauth-flow-admin
```

3. IAM 运行在 `http://localhost:3000`

## 启动

终端 1 — IAM：

```bash
pnpm start:dev
```

终端 2 — flow-admin 静态站：

```bash
pnpm flow-admin:dev
```

浏览器打开：<http://localhost:4173>

## 测试账号

| 角色 | 邮箱 | 密码 | 任务 data scope |
| --- | --- | --- | --- |
| 流程管理员 | `admin@qq.com` | `123456` | `all` |

## SSO 流程

```
index.html  →  /oidc/auth (PKCE)
            →  IAM 登录页 /api/interaction/:uid
            →  callback.html 换 token
            →  app.html 展示 userinfo / 权限 / 可见菜单
```

## 配置

编辑 `config.js` 中的 `applicationId`（若重新 seed 后 ID 变化）。
