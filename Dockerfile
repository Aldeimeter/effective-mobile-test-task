FROM node:22-alpine3.21 AS base
RUN apk add --no-cache dumb-init=1.2.5-r3
USER node
WORKDIR /app
COPY --chown=node:node package.json package.json
COPY --chown=node:node package-lock.json package-lock.json

# Install production dependencies only
FROM base AS deps
USER node
WORKDIR /app
COPY --chown=node:node package*.json .
COPY --chown=node:node prisma/ prisma/
RUN npm ci --omit=dev --ignore-scripts
RUN npx prisma generate

# Compile typescript sources
FROM base AS build
USER node
WORKDIR /app
RUN npm ci
COPY --chown=node:node tsconfig.json tsconfig.json
COPY --chown=node:node prisma/ prisma/
COPY --chown=node:node src/ src/
COPY --chown=node:node test/ test/
RUN npx prisma generate
RUN npm run build

# Combine production only node_modules with compiled javascript files.
FROM node:22-alpine3.21 AS production
RUN apk add --no-cache dumb-init=1.2.5-r3
USER node
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/generated ./generated
COPY --chown=node:node --from=build /app/dist/src ./dist
COPY --chown=node:node --from=build /app/package.json ./
COPY --chown=node:node prisma/ prisma/
CMD [ "dumb-init", "node", "/app/dist/server.js" ]

FROM build AS test
USER node
WORKDIR /app
COPY --chown=node:node jest.config.cjs jest.config.cjs
COPY --chown=node:node .env.test .env
CMD ["npm", "test"]
