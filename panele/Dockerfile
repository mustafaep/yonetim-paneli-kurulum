# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_PORTFOLIO_DEMO_LOGIN
ARG VITE_PORTFOLIO_AUTO_LOGIN
ARG VITE_PORTFOLIO_DEMO_EMAIL
ARG VITE_PORTFOLIO_DEMO_PASSWORD
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_PORTFOLIO_DEMO_LOGIN=${VITE_PORTFOLIO_DEMO_LOGIN}
ENV VITE_PORTFOLIO_AUTO_LOGIN=${VITE_PORTFOLIO_AUTO_LOGIN}
ENV VITE_PORTFOLIO_DEMO_EMAIL=${VITE_PORTFOLIO_DEMO_EMAIL}
ENV VITE_PORTFOLIO_DEMO_PASSWORD=${VITE_PORTFOLIO_DEMO_PASSWORD}

# Build application
RUN npm run build -- --outDir dist

# Verify build output exists and show contents (helps debug VPS builds)
RUN echo "=== Frontend build output directory ===" && \
    ls -la /app && \
    (test -d /app/dist && ls -la /app/dist) || \
    (echo "Build succeeded but /app/dist not found. Listing directories for debugging:" && find /app -maxdepth 2 -type d -print && exit 1)

# ---- Production stage ----
FROM nginx:alpine

# Install tools used by HEALTHCHECK (wget may not be present by default)
RUN apk add --no-cache wget

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
