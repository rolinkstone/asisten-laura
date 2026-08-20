FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Copy production env file
COPY .env.production .env

EXPOSE 5000

CMD ["node", "server.js"]