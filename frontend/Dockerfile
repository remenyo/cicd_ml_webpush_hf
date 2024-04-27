# Base image
FROM node:22-alpine as base

# Copy package.json and package-lock.json
COPY . .

# Install dependencies
RUN npm i

run npm run build

FROM scratch AS export-stage

COPY --from=base /dist/* .
