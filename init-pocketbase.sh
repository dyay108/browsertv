#!/bin/sh
set -e

# echo "Starting PocketBase initialization script..."

# # Install required packages
# echo "Installing required packages..."
# apk add --no-cache nodejs npm curl

# export ADMIN_EMAIL
# export ADMIN_PASSWORD

# Setup directories
mkdir -p /pb/pb_data
mkdir -p /pb/pb_setup

# Install PocketBase npm package if needed
cd /pb
if [ ! -d '/pb/node_modules/pocketbase' ]; then
  echo "Installing PocketBase npm package..."
  npm init -y
  npm install pocketbase
  echo "PocketBase npm package installed"
else
  echo "PocketBase npm package already installed"
fi
# Start PocketBase with bootstrap admin
echo "Starting PocketBase server with bootstrap admin..."
# ./pocketbase superuser create "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}"
./pocketbase serve --http="0.0.0.0:8090" --dir=/pb/pb_data &
PB_PID=$!

# Wait for PocketBase to start (10 seconds)
echo "Waiting for PocketBase to start..."
sleep 10

# # Run the setup collections script
# echo "Running setup collections script..."
# node /pb/setup-collections.js

# Keep container running
echo "Initialization complete. Waiting on PocketBase process..."
wait $PB_PID