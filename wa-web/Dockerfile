# واتساب ويب الرسمي محتاج متصفح حقيقي — و Nixpacks مابيوفّرش واحد شغّال.
# بنجيب كروميوم من الديبيان نفسه، ونمنع بوبيتير إنه ينزّل واحد تاني.
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      fonts-noto-core \
      fonts-noto-color-emoji \
      dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    CHROME_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# dumb-init عشان كروميوم مايسيبش عمليات زومبي ورا كل إعادة تشغيل
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
