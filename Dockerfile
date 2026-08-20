# iam-platform 生产镜像（多 target）
#   docker build -f Dockerfile --target runtime -t iam-platform .
#   docker build -f Dockerfile --target admin -t iam-platform-admin .

ARG NODE_VERSION=22.13.0
ARG NPM_REGISTRY=https://registry.npmmirror.com

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
RUN npm config set registry ${NPM_REGISTRY} \
  && npm install -g pnpm@9.15.0
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV HUSKY=0

# ── IAM 后端依赖 ───────────────────────────────────────────────
FROM base AS deps-iam
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry ${NPM_REGISTRY} \
  && pnpm install --frozen-lockfile

# ── iam-admin 依赖（独立 pnpm 项目）────────────────────────────
FROM base AS deps-admin
WORKDIR /app/apps/iam-admin
COPY apps/iam-admin/package.json apps/iam-admin/pnpm-lock.yaml apps/iam-admin/.npmrc ./
RUN pnpm config set registry ${NPM_REGISTRY} \
  && pnpm install --frozen-lockfile

# ── 构建 IAM 后端 ───────────────────────────────────────────────
FROM deps-iam AS build-iam
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps/iam apps/iam
COPY libs libs
COPY scripts scripts
RUN pnpm build:iam

# ── 构建 iam-admin 前端 ───────────────────────────────────────
FROM deps-admin AS build-admin
COPY apps/iam-admin ./
# iam-admin 的 pnpm-workspace.yaml 只有 pnpm 10 的 allowBuilds，没有 packages。
# 镜像里是 pnpm 9，会报 packages field missing or empty
RUN rm -f pnpm-workspace.yaml \
  && pnpm build

# ── IAM 运行镜像 ───────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
COPY --from=deps-iam /app/node_modules ./node_modules
COPY --from=build-iam /app/dist ./dist
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY scripts/generate-oidc-jwks.js ./scripts/generate-oidc-jwks.js
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["sh", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/apps/iam/src/main"]

# ── iam-admin 运行镜像（Nginx 静态 + /api 反代 IAM）────────────
FROM nginx:1.27-alpine AS admin
COPY deploy/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build-admin /app/apps/iam-admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
