# Base image
FROM node:22-alpine as server

COPY . .

# Install dependencies
RUN npm i

# Expose port (adjust as needed)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
