# Base image
FROM node:22-alpine as server

COPY . .

RUN npm i

CMD ["node", "index.mjs"]
