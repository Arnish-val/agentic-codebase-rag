FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY src/ ./src/

CMD ["node", "src/index.js"]
