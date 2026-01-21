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
// prettier-ignore
const mockData: Record<
  string,
  { conversations: { sender: string; content: string }[]; learnings: { summary: string }[] }
> = {
  'john.doe@example.com': {
    conversations: [
      { sender: 'AI',   content: "What's been exciting or interesting in what you've been learning or doing lately?" },
      { sender: 'USER', content: "I've been really enjoying building web apps and seeing users interact with them.",},
      { sender: 'AI',   content: 'What kind of projects make you lose track of time?' },
      { sender: 'USER', content: 'Anything involving UI design - I can spend hours tweaking interfaces.',},
      { sender: 'AI',   content: 'What do people usually come to you for?' },
      { sender: 'USER', content: 'Frontend advice and debugging CSS issues.' },
    ],
    learnings: [
      { summary: 'Strong frontend/UI focus - loses track of time building interfaces.' },
      { summary: 'Known for frontend expertise and CSS debugging skills.' },
      { summary: 'Motivated by seeing users interact with his work.' },
      { summary: 'Prefers hands-on coding over meetings and documentation.' },
    ],
  },
  'jane.smith@example.com': {
    conversations: [
      { sender: 'AI',   content: "What led you to explore the field or direction you're in right now?",},
      { sender: 'USER', content: 'I loved being the bridge between users and developers, understanding both sides.',},
      { sender: 'AI',   content: 'What kind of teamwork or collaboration makes you feel at your best?',},
      { sender: 'USER', content: 'Cross-functional teams where everyone brings different expertise.',},
      { sender: 'AI',   content: 'If you could shape your next role freely, what would it include?' },
      { sender: 'USER', content: 'Leading product strategy for a product that helps people learn new skills.',},
    ],
    learnings: [
      { summary: 'Thrives as bridge between users and developers.' },
      { summary: 'Values cross-functional collaboration and diverse teams.' },
      { summary: 'Aspires to lead product strategy in education space.' },
      { summary: 'Energized by understanding user needs and translating to solutions.' },
    ],
  },
};

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

async function seedConversations() {
  console.log('Seeding conversations...');

  for (const [userEmail, data] of Object.entries(mockData)) {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      console.log(`User with email ${userEmail} not found. Skipping conversations.`);
      continue;
    }

    // Check if conversations already exist for this user
    const existingConversations = await prisma.conversationMessage.findFirst({
      where: { userId: user.id },
    });

    if (existingConversations) {
      console.log(`Conversations for user ${userEmail} already exist. Skipping.`);
      continue;
    }

    // Create all conversations for this user
    for (const conversation of data.conversations) {
      await prisma.conversationMessage.create({
        data: {
          userId: user.id,
          sender: conversation.sender as 'USER' | 'AI',
          content: conversation.content,
        },
      });
    }

    console.log(`Seeded ${data.conversations.length} conversations for ${userEmail}.`);
  }

  console.log('Conversations seeded successfully.');
}

async function seedLearnings() {
  console.log('Seeding learnings...');

  for (const [userEmail, data] of Object.entries(mockData)) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      console.log(`User with email ${userEmail} not found. Skipping Learnings.`);
      continue;
    }

    // Check if learnings already exist for this user
    const existingLearnings = await prisma.learning.findFirst({
      where: { userId: user.id },
    });

    if (existingLearnings) {
      console.log(`Learnings for user ${userEmail} already exist. Skipping.`);
      continue;
    }

    // Create all learnings for this user
    for (const learning of data.learnings) {
      await prisma.learning.create({
        data: {
          userId: user.id,
          summary: learning.summary,
        },
      });
    }

    console.log(`Seeded ${data.learnings.length} learnings for ${userEmail}.`);
  }

  console.log('Learnings seeded successfully.');
}

export async function seed() {
  if (!seedEnvironment) {
    console.log('Skipping seed in production environment.');
    return;
  }

  console.log('Starting database seeding...');

  try {
    await seedUsers();
    await seedConversations();
    await seedLearnings();
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
