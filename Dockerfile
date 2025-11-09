FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Install serve without cache flag issue
RUN npm install -g serve

EXPOSE 3001


# Start the app - remove problematic -c flag
CMD ["serve", "-s", "dist", "-l", "3001"]