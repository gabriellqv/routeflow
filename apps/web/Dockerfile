# Etapa de build
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm ci

COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

RUN npm run build --workspace @routeflow/contracts
RUN npm run build --workspace @routeflow/web

# Etapa de execução (estático servido por nginx)
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/web/dist/@routeflow/web/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
