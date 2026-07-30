详细参阅 docs

## 本地开发配置同域名访问

本地开发调试：

```bash
node run.js
```

hosts配置后（注意关闭代理）, localhost 开发时 cookie 不区分端口，多 SPA 共用 `authorized-token` 会互相覆盖/清除。按端口隔离 cookie 名；Nginx 子域模式下各 origin 天然隔离，保持默认键名。


```bash
node run-nginx.js
```

## 发布与部署

```bash
git fetch --tags
git checkout v2.0.0
```

需要做 migration

## Portainer Stack Details
```yaml
# iam-compose.yml 业务应用栈
networks:
  app-net:
    external:
      name: infra_app-net  # 关键！完整网络名=栈名_网络名

services:
  # 后端1：iam-platform-iam
  iam:
    image: iam-platform-iam:latest
    container_name: iam-platform-iam
    restart: unless-stopped
    networks:
      - app-net
    environment:
      # 同网络直接用容器名访问基础设施
      DB_HOST: mysql8
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: 123456
      REDIS_HOST: redis7
      REDIS_PORT: 6379
      DB_DATABASE: iam
      OIDC_ISSUER: http://192.168.50.100:9446/oidc
      APP_URL: http://192.168.50.100:9446
      BETTER_AUTH_URL: http://192.168.50.100:9446
      OIDC_COOKIE_KEYS: dev-key-1,dev-key-2
      CORS_ORIGINS: http://192.168.50.100:9445
      IAM_INTERACTION_UI_DIR: /app/dist/apps/iam/src/assets/interaction
    # 按需暴露端口（内部互通不需要端口，仅本地调试可映射）
    ports:
      - "3001:3000"

  # 前端1：iam-platform-admin
  iam-platform-admin:
    image: iam-platform-admin:latest
    container_name: iam-platform-admin
    restart: unless-stopped
    networks:
      - app-net
    ports:
      - "9446:80"

```

## jwks
 
```bash
pnpm oidc:jwks:generate   # 生成私钥 JWKS
pnpm oidc:jwks:rotate     # 末尾追加新钥 → 重启（可验、尚未签发）
pnpm oidc:jwks:promote    # 新钥提到首位 → 再重启（开始签发）
pnpm oidc:jwks:public     # 打印公钥 JWKS
```

## Changelogs

v2.0.0 （release）

优化和修复部分bug，解决多client退出、同一SSO状态互串问题，同处于SSO登录页一个client登陆后另个client自动登录，SSO登录后client退出相互不影响。

v1.0.0

完成基本功能， 多业务域模块，基本OIDC、ABAC、RBAC 以及多表设计等。