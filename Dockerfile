FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY RTC_server/package.json ./
RUN npm install --production

COPY RTC_server/server.js ./

# Copy React build output
COPY rtc-client/build ./public

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
