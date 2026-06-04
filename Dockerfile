# V/J Sync — production image (API + static frontend + Socket.IO)
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
RUN apk add --no-cache openssl
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/prisma ./prisma
COPY backend/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app/backend
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm install --no-save prisma@6.8.0 ts-node@10.9.2

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY backend/prisma ./prisma
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

RUN mkdir -p uploads

COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
