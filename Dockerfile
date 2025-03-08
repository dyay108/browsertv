# Stage 1: Build the React application
FROM --platform=$BUILDPLATFORM node:18-alpine as react-build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all frontend files
COPY . .

# Build the app
RUN npm run build

# Stage 2: Setup the final image with Nginx and PocketBase
FROM --platform=$TARGETPLATFORM nginx:alpine

# Install supervisord to manage multiple processes
RUN apk add --no-cache supervisor nodejs npm

# Copy the React build from stage 1
COPY --from=react-build /app/build /usr/share/nginx/html

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create PocketBase directory
RUN mkdir -p /pocketbase/pb_data

# Copy local PocketBase binary and setup script
COPY pocketbase /pocketbase/pocketbase
COPY setup-collections.js /pocketbase/setup-collections.js

# Make PocketBase executable
RUN chmod +x /pocketbase/pocketbase

# Install PocketBase JS SDK for the setup script
WORKDIR /pocketbase
RUN npm init -y && npm install pocketbase

# Create supervisord config
RUN mkdir -p /etc/supervisor/conf.d
COPY supervisord.conf /etc/supervisor/supervisord.conf

# Expose ports
EXPOSE 80 8090

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]