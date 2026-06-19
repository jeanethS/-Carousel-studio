# Carousel Studio — Docker image
FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/
COPY config/ ./config/

# Build TypeScript
RUN npm run build

# Create output and logs directories
RUN mkdir -p output logs tmp

# Default: run the orchestrator
CMD ["npm", "run", "task:orchestrator"]
