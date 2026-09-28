FROM node:24-alpine
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]