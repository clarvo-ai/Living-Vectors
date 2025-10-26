#!/bin/sh

# Wait for database to be ready
# echo "Waiting for database to be ready..."
until pg_isready -h db -U postgres; do
#   echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready!"
# Run migrations
# echo "Running database migrations..."
npx turbo run db:migrate

# Run seed
# echo "Running database seed..."
npx turbo run db:seed

# echo "Database initialization completed." 