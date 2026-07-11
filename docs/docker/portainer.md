Stack details

## infra

```yaml
networks:
  app-net:
    driver: bridge

services:
  nginx:
    image: nginx:1.27
    container_name: nginx
    ports:
      - "9445:80"
    volumes:
      - nginx-data:/etc/nginx/conf.d:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    networks: # 加入公共网桥
      - app-net

  mysql:
    image: mysql:8.4
    container_name: mysql8
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: 123456
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped
    networks:
      - app-net
    command:
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

  redis:
    image: redis:7.4
    container_name: redis7
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks: # 加入公共网桥
      - app-net

volumes:
  mysql-data:
  redis-data:
  nginx-data:
```
app-net 统一网络

## iam-platform

```yaml
# iam-compose.yml 业务应用栈
networks:
  app-net:
    external:
      name: infra_app-net  # 关键！完整网络名=栈名_网络名

services:
  # 后端1：iam-platform-iam
  iam:
    image: iam-platform-server:latest
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
      # OIDC（与浏览器访问 admin 的地址一致，admin Nginx 反代 /oidc）
      APP_URL: http://192.168.50.100:9446
      BETTER_AUTH_URL: http://192.168.50.100:9446
      OIDC_ISSUER: http://192.168.50.100:9446/oidc
      OIDC_COOKIE_KEYS: dev-key-1,dev-key-2
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