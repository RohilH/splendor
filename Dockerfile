FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build:client && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start:server"]
