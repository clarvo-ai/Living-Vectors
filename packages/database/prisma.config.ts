import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma/schema'),
  datasourceUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_DATABASE_URL,
});
