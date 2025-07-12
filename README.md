# POS AI - Mobile-First Point of Sale System

A comprehensive mobile-first POS system for small to medium businesses built with Next.js 14, Supabase, and AI-powered insights.

## Features

- 📱 **Mobile-First Design**: Optimized for mobile devices with PWA capabilities
- 🔐 **Multiple Auth Options**: Email/password and Google OAuth authentication
- 🏪 **Multi-Store Support**: Manage multiple store locations
- 📊 **AI-Powered Analytics**: Business insights and sales forecasting
- 💳 **POS System**: Complete point-of-sale functionality
- 📦 **Product Management**: Full catalog and inventory management
- 🎯 **Role-Based Access**: Staff permissions and management

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account
- Google OAuth credentials (optional)
- OpenAI API key (for AI features)

### Environment Setup

1. Copy the environment template:
```bash
cp .env.local.example .env.local
```

2. Configure your environment variables in `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key

# App URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
6. Configure in Supabase:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google Client ID and Secret

### Installation and Development

Install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
