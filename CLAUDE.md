# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a mobile-first Point of Sale (POS) and business management system built with Next.js 14. The project is designed for small to medium businesses, enabling multi-store management, product catalog administration, transaction processing, and business analytics through a responsive web application optimized for mobile devices.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui (configured with Lucide React icons)
- **Utilities**: 
  - `clsx` and `tailwind-merge` for conditional styling
  - `class-variance-authority` for component variants
  - `zod` for schema validation

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Project Structure

- `/app` - Next.js App Router directory containing pages and layouts
- `/components` - Reusable React components (shadcn/ui components go in `/components/ui`)
- `/lib` - Utility functions and shared libraries
- `/lib/utils.ts` - Contains the `cn()` utility for combining class names

## Key Configuration

- **Tailwind Config**: Uses CSS variables for theming with light/dark mode support
- **TypeScript**: Configured with strict mode and path mapping (`@/*` points to root)
- **shadcn/ui**: Configured with "new-york" style, using Tailwind CSS variables

## Architecture Notes

The application follows a mobile-first approach with:
- Progressive Web App (PWA) capabilities planned
- Offline transaction support
- Touch-optimized interfaces
- Responsive design across mobile, tablet, and desktop

## Product Requirements

According to the PRD, this system will include:
- Product catalog management with categories and inventory tracking
- Multi-store support with role-based access control
- POS interface with barcode scanning and multiple payment methods
- Analytics dashboard with sales reporting
- Customer management and loyalty features

The development is planned in phases:
1. Core MVP (basic product management, simple POS, cash payments)
2. Enhanced features (multi-store, advanced product management, multiple payments)
3. Advanced analytics (comprehensive reporting, data visualization)
4. Polish & launch (PWA, offline capabilities, final testing)

## Important Notes

- The project uses Geist fonts (Sans and Mono) for typography
- Dark mode is implemented using Tailwind's class-based dark mode
- All components should follow the established shadcn/ui patterns
- The application prioritizes mobile user experience