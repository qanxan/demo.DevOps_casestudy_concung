# syntax=docker/dockerfile:1

# ---------- Stage 1: dependencies ----------
# Tach rieng stage cai deps de tan dung layer cache:
# chi cai lai node_modules khi package*.json thay doi.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Chay bang user non-root (security best practice)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./

USER nodejs
EXPOSE 3000

# ARG duoc set boi pipeline (--build-arg APP_VERSION=...)
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

# Healthcheck o tang container (bo tro cho probe cua K8s)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1

CMD ["node", "server.js"]
