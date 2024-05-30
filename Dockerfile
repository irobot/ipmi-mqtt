# Multi-step build process
# 1. Transpile TS to JS
# 2. Install ipmitool on a alpine node image
# 3. Copy the transpiled JS from step 1
FROM node:22 as builder
WORKDIR /app
RUN npm install -g pnpm@8.6.2
COPY . ./
RUN pnpm i --frozen-lockfile
RUN pnpm run build

FROM node:22-alpine3.20 AS base
RUN apk add --no-cache ipmitool

FROM base AS modules
RUN npm install -g pnpm@8.6.2
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm i -P --frozen-lockfile

FROM base as final
WORKDIR /srv
COPY --from=modules /app/node_modules ./node_modules
COPY --from=builder /app/dist ./
CMD ["node", "server.js"]