FROM node:20-bookworm-slim AS base

# Disable Next.js telemetry for all stages
ENV NEXT_TELEMETRY_DISABLED=1

# Always run from /app
WORKDIR /app

# Install dependencies in an isolated layer
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production runtime image using the standalone output
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Copy the compiled app and runtime assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

EXPOSE 3000

CMD ["server.js"]
