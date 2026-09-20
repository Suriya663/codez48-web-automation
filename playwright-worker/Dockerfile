FROM mcr.microsoft.com/playwright:v1.42.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Safety: Create symlink so both 'node server.js' and 'node playwright-worker/server.js' work
RUN mkdir -p playwright-worker && ln -s /app/server.js /app/playwright-worker/server.js

EXPOSE 8080

CMD ["node", "server.js"]
