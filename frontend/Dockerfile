# Base image
FROM node:22-alpine as base

COPY . .

RUN npm i

run npm run build

FROM scratch AS export-stage

COPY --from=base /dist/* .
