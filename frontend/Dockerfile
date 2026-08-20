FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Clean npm cache dan install dependencies
RUN npm cache clean --force && \
    npm ci --no-audit --legacy-peer-deps

# Copy source code
COPY . .

# Build aplikasi Next.js
RUN npm run build

# Set environment variable untuk port
# ⭐ PASTIKAN PORT 3004 untuk Next.js
ENV PORT=3004
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

# Expose port yang benar
EXPOSE 3004

# Start aplikasi
CMD ["npm", "start"]