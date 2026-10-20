# syntax=docker.io/docker/dockerfile:1

FROM node:26.12.1-alpine AS base
RUN npm install --global corepack@0.36.0 --force && corepack enable && corepack prepare pnpm@12.14.0 --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
