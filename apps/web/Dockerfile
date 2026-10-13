FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build -w @deck/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
