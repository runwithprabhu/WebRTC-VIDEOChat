FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./

ENV PORT=3000
ENV MAX_PARTICIPANTS=4

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider --no-check-certificate https://localhost:3000/health || exit 1

CMD ["node", "server.js"]
