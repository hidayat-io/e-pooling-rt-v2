FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
ENV ENABLE_LOCAL_CRON=false

EXPOSE 8080

CMD ["npm", "run", "start:api"]
