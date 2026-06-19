FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY RTC_server/package.json ./
RUN npm install --production

COPY RTC_server/server.js ./

# Copy client files
COPY RTC_Client ./public

# Update server.js static path to use /app/public inside container
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
