FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:server"]
