# Build stage
FROM node:22-bullseye-slim AS builder

WORKDIR /app

# Use pnpm via Corepack for reproducible installs
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests first for efficient dependency install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY artifacts/spi/package.json ./artifacts/spi/package.json

# Copy repository files for workspace install and builds
COPY . ./

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/spi run build
RUN pnpm --filter @workspace/api-server run build

# Runtime stage
FROM node:22-bullseye-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built backend, built frontend assets, and package metadata for runtime dependency install
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/spi/dist/public ./artifacts/spi/dist/public
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/lib/api-zod ./lib/api-zod
COPY --from=builder /app/lib/db ./lib/db

RUN pnpm install --prod --frozen-lockfile --filter @workspace/api-server

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
