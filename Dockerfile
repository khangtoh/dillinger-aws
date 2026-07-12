FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV AWS_LWA_PORT=3000
ENV HOSTNAME=0.0.0.0

# Shared libraries @sparticuz/chromium needs at runtime (PDF export).
# Its binary targets Amazon Linux Lambda images, which ship these;
# bookworm-slim doesn't, so Chromium fails to launch without them
# ("libnspr4.so: cannot open shared object file").
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
      libasound2 \
    && rm -rf /var/lib/apt/lists/*

# AWS Lambda Web Adapter — proxies Lambda invoke events to the Next.js
# server over localhost HTTP, so server.js runs completely unmodified.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER node

EXPOSE 3000
CMD ["node", "server.js"]
