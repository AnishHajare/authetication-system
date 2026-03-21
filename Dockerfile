FROM node:20-bookworm-slim AS base

WORKDIR /app

COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM base AS production-deps
RUN npm ci --omit=dev

FROM deps AS test
COPY . .
CMD ["npm", "test"]

FROM production-deps AS production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
