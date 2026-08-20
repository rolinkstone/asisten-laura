FROM node:24-slim

WORKDIR /usr/src/app

# Build tools untuk native module (bcrypt, onnxruntime, dll) — image Debian/glibc
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Copy production env file
COPY .env.production .env

EXPOSE 5003

CMD ["node", "server.js"]