#!/bin/sh

# Wait for localhost MySQL database to be ready
echo "Waiting for localhost MySQL database to be ready..."

# Wait for database connection on host
until nc -z host.docker.internal 3306; do
  echo "MySQL database not ready, waiting..."
  sleep 2
done

echo "MySQL database is ready!"

# Additional wait to ensure database is fully ready
sleep 5

# Start the application
npm start