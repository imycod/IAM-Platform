# iam-platform 生产镜像
#   docker build -f Dockerfile -t iam-platform .

ARG NODE_VERSION=22.13.0
ARG NPM_REGISTRY=https://registry.npmmirror.com

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
RUN npm config set registry ${NPM_REGISTRY} \
  && npm install -g pnpm@9.15.0
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

# ── 依赖层（利用缓存）────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry ${NPM_REGISTRY} \
  && pnpm install --frozen-lockfile

# ── 构建层 ────────────────────────────────────────────────────
FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps/iam apps/iam
COPY libs libs
COPY scripts scripts
RUN pnpm build:iam

# ── 运行镜像 ────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["sh", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/apps/iam/src/main"]
