# Stage 1: Dependencies and Build
FROM node:20-slim AS builder

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate the client
COPY prisma ./prisma
RUN pnpm prisma generate

# Copy the rest of the application code
COPY . .

# Build the TypeScript project
RUN pnpm build

# Stage 2: Production Image
FROM node:20-slim AS runner

# Install OpenSSL (required by Prisma at runtime)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set to production environment
ENV NODE_ENV=production

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package files to install production dependencies
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema and generated client from the builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Create an uploads directory just in case it's needed (common for multer)
RUN mkdir -p uploads && chown -R node:node uploads

# Change user to non-root for security
USER node

# Expose the application port (update if your app uses a different port)
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
