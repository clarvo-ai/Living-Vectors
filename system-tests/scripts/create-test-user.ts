import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '../../packages/database/prisma/generated/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemTestsDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(systemTestsDir, '.env.local') });

const prisma = new PrismaClient();

async function main() {
  const testEmail = process.env.TEST_USER_EMAIL || 'systest@livingvectors.test';
  const testName = process.env.TEST_USER_NAME || 'System Tester';
  const testPhone = process.env.TEST_USER_PHONE || '+358123456789';
  const sessionToken = process.env.TEST_SESSION_TOKEN || 'lv-e2e-session-token';

  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      name: testName,
      phone: testPhone,
      emailVerified: new Date(),
    },
    create: {
      email: testEmail,
      name: testName,
      phone: testPhone,
      emailVerified: new Date(),
    },
  });

  // Reset mutable interview artifacts so every system-test run starts from a clean state.
  await prisma.$transaction([
    prisma.completedTask.deleteMany({ where: { userId: user.id } }),
    prisma.jobRecommendation.deleteMany({ where: { userId: user.id } }),
    prisma.userEmbedding.deleteMany({ where: { userId: user.id } }),
    prisma.learning.deleteMany({ where: { userId: user.id } }),
    prisma.conversationMessage.deleteMany({ where: { userId: user.id } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.session.upsert({
    where: { sessionToken },
    update: {
      userId: user.id,
      expires,
      userAgent: 'playwright',
    },
    create: {
      sessionToken,
      userId: user.id,
      expires,
      userAgent: 'playwright',
    },
  });

  console.log('Created/updated Playwright test user, reset prior test data, and created session');
  console.log(`TEST_USER_EMAIL=${testEmail}`);
  console.log(`TEST_SESSION_TOKEN=${sessionToken}`);
  console.log(`TEST_USER_ID=${user.id}`);
}

main()
  .catch((error: unknown) => {
    console.error('Failed to create test user/session:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
