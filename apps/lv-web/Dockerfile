# Base stage
FROM node:22-alpine AS base

# Install dependencies needed for Puppeteer/Chromium
RUN apk update && \
    apk add --no-cache libc6-compat \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    postgresql-client

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create builder stage for pruning the monorepo
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_PYAPI_URL

# Install turbo globally for monorepo operations
RUN npm install turbo --global

# Copy the entire repo for turbo to work correctly
COPY . .

# Use turbo to prune the monorepo to only what's needed for lv-web
RUN turbo prune lv-web --docker

# Create installer stage for installing dependencies
FROM base AS installer
WORKDIR /app

ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_PYAPI_URL

# Copy package.json and other dependency files from the pruned output
COPY --from=builder /app/out/json/ .
# Install dependencies with frozen lockfile to ensure consistent builds
RUN npm install --frozen-lockfile

# Copy the rest of the application
COPY --from=builder /app/out/full/ .

# Generate Prisma client before building the application
RUN npx turbo run db:generate

ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}
ENV NEXT_PUBLIC_PYAPI_URL=${NEXT_PUBLIC_PYAPI_URL}

# Build the application
RUN npm run build:lv-web

# Create a smaller production image
FROM base AS runner
WORKDIR /app

ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_PYAPI_URL

ENV NODE_ENV=production
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}
ENV NEXT_PUBLIC_PYAPI_URL=${NEXT_PUBLIC_PYAPI_URL}

# Create a non-root user for improved security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/next.config.mjs ./apps/lv-web/next.config.mjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/package.json ./apps/lv-web/package.json
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/.next/static ./apps/lv-web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/public ./apps/lv-web/public

# Switch to non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 3000

# Use standalone Next.js server for improved performance
CMD ["node", "apps/lv-web/server.js"]