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

# Run seed (non-blocking - don't fail if seed errors)
# echo "Running database seed..."
npx turbo run db:seed || echo "Seed script failed, continuing anyway..."

# echo "Database initialization completed." 