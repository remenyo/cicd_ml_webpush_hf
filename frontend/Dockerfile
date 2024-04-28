# Base image
FROM node:22-alpine as base

COPY . .

RUN npm i

run npm run build

RUN tar -czf dist.tar.gz -C /dist .

FROM scratch AS export-stage

COPY --from=base /dist.tar.gz .
