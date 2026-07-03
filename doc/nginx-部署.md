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

domain

```
login.pinshuai.com
          │
          ▼
      iam-login

api.pinshuai.com
          │
          ▼
        iam

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

login：
```
server {
    server_name login.pinshuai.com;

    location / {
        root /opt/iam-platform/login/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

```
server {
    server_name iam.pinshuai.com;

    location / {
        root /opt/iam-platform/admin/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
    }

    location /oidc {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

