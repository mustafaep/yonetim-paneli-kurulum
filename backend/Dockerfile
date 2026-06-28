# ---- Build stage ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Optional: allow overriding Prisma engines download base (useful in restricted networks)
ARG PRISMA_ENGINES_MIRROR
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}

# Prisma (and some native deps) rely on OpenSSL + CA certificates.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies (package-lock.json'dan tam sürümleri kullanır)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema & generate client
# NOT: prisma CLI ve @prisma/client sürümleri package.json'da eşleştirilmiştir.
# Hardcoded versiyon KULLANMAYIN - sürüm uyumsuzluğu veritabanı hatalarına yol açar.
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code & build
COPY . .
RUN npm run build

# Build doğrulama
RUN test -f /app/dist/main.js || test -f /app/dist/src/main.js || \
    (echo "ERROR: main.js bulunamadı" && ls -la /app/dist/ && exit 1)

# ---- Production stage ----
FROM node:20-bookworm-slim

WORKDIR /app

# Optional: allow overriding Prisma engines download base (useful in restricted networks)
ARG PRISMA_ENGINES_MIRROR
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}

# System dependencies for:
# - Prisma engines (OpenSSL)
# - Puppeteer: Chromium (container'da "puppeteer browsers install" yerine apt ile;
#   PdfService PUPPETEER_EXECUTABLE_PATH veya /usr/bin/chromium kullanır)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    wget \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    libgtk-3-0 \
  && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm install -D ts-node tsconfig-paths @types/node @types/bcrypt && \
    npm cache clean --force

# Copy Prisma files (generate edilen client + schema + CLI)
COPY prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy TypeScript config files for seed operations
COPY tsconfig.json tsconfig.prisma.json ./

# Runtime'da migration çalıştırmak için prisma CLI gerekli
# package.json'daki sürümü kullan (hardcoded versiyon değil!)
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Verify dist directory exists in production stage
RUN ls -la /app/dist/ || (echo "dist directory not found in production stage" && exit 1)

# Create uploads directory with all necessary subdirectories
RUN mkdir -p uploads/documents uploads/logos uploads/header-paper && \
    chown -R node:node /app && \
    chmod -R 755 uploads

# chmod must run before USER node (non-root cannot chmod root-owned COPY'd files).
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
