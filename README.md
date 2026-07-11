详细参阅 docs

## 本地开发配置同域名访问

本地开发调试：

```bash
node run.js
```

hosts配置后（注意关闭代理）

```bash
node run-nginx.js
```

## 发布与部署

```bash
git fetch --tags
git checkout v2.0.0
```

需要做 migration

## Changelogs

v2.0.0 （release）

优化和修复部分bug，解决多client退出、同一SSO状态互串问题，同处于SSO登录页一个client登陆后另个client自动登录，SSO登录后client退出相互不影响。

v1.0.0

完成基本功能， 多业务域模块，基本OIDC、ABAC、RBAC 以及多表设计等。