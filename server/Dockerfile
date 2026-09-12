# ==============================================================================
# STAGE 1: BUILDER (Compiles TypeScript to Production JavaScript)
# ==============================================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling
COPY package*.json ./
RUN npm ci

# Copy source code and build config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Prune development dependencies (removes tsc, vitest, etc.)
RUN npm prune --production

# ==============================================================================
# STAGE 2: RUNNER (Ultra-Lean, Secure Production Runtime)
# ==============================================================================
FROM node:24-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5001

# Copy only production dependencies and compiled artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Run as non-privileged system user for container security
USER node

EXPOSE 5001

# Health check probe against operational endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start production server
CMD ["node", "dist/index.js"]
