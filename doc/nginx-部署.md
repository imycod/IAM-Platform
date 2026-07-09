IAM Platform
```
apps
│
├── iam                 ← NestJS
│
├── iam-login           ← html（统一登录）
│
└── iam-admin           ← Vue（后台）
```

# 部署：

domain（Google 式：登录 UI 与 OIDC 必须同源 = auth）

```
auth.pinshuai.com
          │
          ├── /          → iam-login（统一登录 / consent）
          ├── /oidc      → iam（OIDC IdP）
          └── /api       → iam（interaction 等）

api.pinshuai.com
          │
          ▼
        iam（业务 API；不要把 /oidc 挂在这里）

admin.pinshuai.com
          │
          ▼
      iam-admin
```

ng structure

```
/opt/platform

├── iam-server (iam)
│
├── iam-admin
│
│    dist
│
└── iam-login 
     dist
```

or

```
/srv (IAM)

├── server

├── admin

└── login
```

ng code
```
server {

    listen 80;

    server_name login.company.com;

    root /opt/platform/login/dist;

    index index.html;

    location / {

        try_files $uri $uri/ /index.html;

    }

}
```

auth（IdP 同源）：
```
server {
    server_name auth.pinshuai.com;

    location /oidc {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /opt/iam-platform/login/dist;
        try_files $uri /index.html;
    }
}
```

api（仅业务）：
```
server {
    server_name api.pinshuai.com;

    location /oidc {
        return 302 https://auth.pinshuai.com$request_uri;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

admin：
```
server {
    server_name admin.pinshuai.com;

    location / {
        root /opt/iam-platform/admin/dist;
        try_files $uri /index.html;
    }
}
```

上线环境变量见仓库根目录 `.env.production`（`OIDC_ISSUER` / `IAM_LOGIN_URL` 均指向 auth 域）。

