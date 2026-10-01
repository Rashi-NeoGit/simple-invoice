# --- Build stage ---
FROM node:18-alpine AS build
# bcrypt is a native module; these let node-gyp compile it from source when a
# prebuilt binary isn't reachable (e.g. a network-restricted build host), instead
# of silently failing the whole image build.
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:18-alpine AS production
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
