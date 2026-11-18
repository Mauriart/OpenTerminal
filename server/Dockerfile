FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json server/
RUN npm install --workspace server --include-workspace-root=false || npm install --prefix server
COPY server/tsconfig.json server/
COPY server/src server/src
RUN npm run build --prefix server

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates poppler-utils \
  && rm -rf /var/lib/apt/lists/*
COPY server/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/server/dist ./dist
COPY vendor/day-trader-skill /app/vendor/day-trader-skill
ENV DAYTRADER_PACK=/app/vendor/day-trader-skill
EXPOSE 4000
CMD ["node", "dist/index.js"]
