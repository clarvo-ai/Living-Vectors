# Fullstack Template

A simple, clean fullstack template built with Next.js, NextAuth.js, Prisma, and Tailwind CSS.

## Features

- 🔐 **Authentication**: OAuth integration with Google and GitHub via NextAuth.js
- 👤 **User Management**: Complete CRUD operations for user profiles
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS and Radix UI components
- 🗄️ **Database**: PostgreSQL with Prisma ORM
- 📱 **Responsive**: Mobile-first design approach
- 🚀 **TypeScript**: Full type safety throughout the application

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your environment variables:

   ```bash
   cp .env.example .env.local
   ```

4. Configure your `.env.local` file:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # GitHub OAuth (optional)
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   ```

5. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth.js configuration
│   │   └── profile/       # User profile API routes
│   ├── dashboard/         # Main dashboard page
│   ├── login/            # Login page
│   ├── profile/          # Profile management page
│   └── page.tsx          # Root page (redirects to login/dashboard)
├── components/
│   └── ui/               # Reusable UI components
└── lib/
    └── utils.ts          # Utility functions
```

## Available Pages

- `/` - Root page (redirects based on auth status)
- `/login` - Authentication page with OAuth providers
- `/dashboard` - Main dashboard for authenticated users
- `/profile` - User profile management with CRUD operations

## API Routes

- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update user profile

## Technologies Used

- **Framework**: Next.js 15
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Forms**: React Hook Form with Zod validation
- **Notifications**: Sonner
- **TypeScript**: Full type safety

## Customization

This template is designed to be easily customizable:

1. **Styling**: Modify `src/app/globals.css` and Tailwind configuration
2. **Database Schema**: Update `prisma/schema.prisma` and run migrations
3. **Authentication Providers**: Add more providers in NextAuth configuration
4. **UI Components**: Extend or modify components in `src/components/ui/`

## Deployment

The template is ready for deployment on platforms like Vercel, Netlify, or any Node.js hosting service.

1. Set up your production database
2. Configure environment variables in your hosting platform
3. Deploy your application

## License

MIT License - feel free to use this template for your projects!
# CI/CD trigger
