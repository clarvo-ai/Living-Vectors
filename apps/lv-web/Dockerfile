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

# Add build argument for environment
ARG NEXT_PUBLIC_ENVIRONMENT

# Install turbo globally for monorepo operations
RUN npm install turbo --global

# Copy the entire repo for turbo to work correctly
COPY . .

# Use turbo to prune the monorepo to only what's needed for lv-web
RUN turbo prune lv-web --docker

# Create installer stage for installing dependencies
FROM base AS installer
WORKDIR /app

# Add build argument for environment
ARG NEXT_PUBLIC_ENVIRONMENT

# Copy package.json and other dependency files from the pruned output
COPY --from=builder /app/out/json/ .
# Install dependencies with frozen lockfile to ensure consistent builds
RUN npm install --frozen-lockfile

# Copy the rest of the application
COPY --from=builder /app/out/full/ .

# Generate Prisma client before building the application
RUN npx turbo run db:generate

# Set environment variable if provided
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}

# Build the application
RUN npx turbo run build --filter=lv-web -- --no-lint

# Create a smaller production image
FROM base AS runner
WORKDIR /app

# Add build argument for environment (to pass through to runtime)
ARG NEXT_PUBLIC_ENVIRONMENT

# Set environment variable for runtime if provided
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}

# Set PORT environment variable for Cloud Run
ENV PORT=8080

# Create a non-root user for improved security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/.next/static ./apps/lv-web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/lv-web/public ./apps/lv-web/public

# Switch to non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 8080

# Use standalone Next.js server for improved performance
CMD ["node", "apps/lv-web/server.js"] 