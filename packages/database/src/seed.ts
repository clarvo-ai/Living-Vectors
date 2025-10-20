import { prisma } from './client';

const seedEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// Simple user data for seeding
const mockUsers = [
  {
    name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    bio: 'Software engineer with 5 years of experience in web development.',
    phone: '+1-555-0123',
  },
  {
    name: 'Jane Smith',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    bio: 'Product manager passionate about building user-centric applications.',
    phone: '+1-555-0456',
  },
];

async function seedUsers() {
  console.log('Seeding users...');

  for (const userData of mockUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
      select: { id: true },
    });

    if (existingUser) {
      console.log(`User with email ${userData.email} already exists. Skipping.`);
      continue;
    }

    const user = await prisma.user.create({
      data: userData,
    });

    console.log(`User ${user.name} (${user.email}) seeded successfully.`);
  }

  console.log('Users seeded successfully.');
}

export async function seed() {
  if (!seedEnvironment) {
    console.log('Skipping seed in production environment.');
    return;
  }

  console.log('Starting database seeding...');

  try {
    await seedUsers();
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
