# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# ============================================================
# Stage 2: Builder (compile admin UI)
# ============================================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .

# Build Strapi admin panel
ENV NODE_ENV=production
RUN npm run build

# ============================================================
# Stage 3: Production Runner
# ============================================================
FROM node:20-alpine AS runner

RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init \
    && addgroup --system --gid 1001 strapi \
    && adduser --system --uid 1001 strapi

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=strapi:strapi /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=strapi:strapi /app/build ./build
COPY --from=builder --chown=strapi:strapi /app/dist ./dist
COPY --from=builder --chown=strapi:strapi /app/public ./public

# Copy source (needed at runtime by Strapi)
COPY --chown=strapi:strapi ./config ./config
COPY --chown=strapi:strapi ./src ./src
COPY --chown=strapi:strapi ./database ./database
COPY --chown=strapi:strapi ./package.json ./package.json
COPY --chown=strapi:strapi ./favicon.png ./favicon.png

# Create directories for uploads and logs
RUN mkdir -p /app/public/uploads /app/logs \
    && chown -R strapi:strapi /app/public/uploads /app/logs

USER strapi

EXPOSE 1337

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:1337/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "node_modules/.bin/strapi", "start"]
