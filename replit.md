# Overview

This is a Farcaster content creation application that uses AI to generate social media content for the decentralized social network Farcaster. The application allows users to connect their wallets, generate AI-powered content using OpenAI's GPT models, select accompanying images from Pexels, and publish directly to Farcaster. It features a modern React frontend with TypeScript, a Node.js Express backend, and uses Drizzle ORM for database operations with PostgreSQL.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom CSS variables for theming (dark/light mode support)
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Wallet Integration**: Custom wallet provider supporting Web3 wallet connections (MetaMask, etc.)

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and logging middleware
- **Development**: TSX for TypeScript execution in development, ESBuild for production builds

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Two main entities - Users (wallet addresses, Farcaster profiles) and ContentDrafts (generated content, images, publishing status)
- **Storage Strategy**: In-memory storage fallback for development, designed for PostgreSQL in production
- **Migrations**: Drizzle Kit for database schema management

## Authentication & Authorization
- **Wallet-based Authentication**: Users authenticate via Web3 wallet signatures
- **Session Management**: No traditional sessions - wallet address serves as user identifier
- **User Profiles**: Integration with Farcaster profiles (FID, username, display name, avatar)

## External Dependencies

### Third-party APIs
- **OpenAI API**: GPT-5 model for AI content generation with customizable prompts based on topic, content type, and tone
- **Pexels API**: Stock photography search and retrieval for content images
- **Farcaster Hub API**: Direct integration for publishing casts to the Farcaster network
- **Neon Database**: Serverless PostgreSQL hosting for production database

### Key Libraries
- **UI Components**: Complete Radix UI ecosystem (dialogs, dropdowns, forms, etc.) wrapped in Shadcn/ui
- **Form Handling**: React Hook Form with Zod schema validation
- **Date Utilities**: date-fns for date manipulation and formatting
- **Styling Utilities**: class-variance-authority and clsx for conditional CSS classes
- **Image Handling**: Embla Carousel for image galleries and selection interfaces

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Error Handling**: Runtime error overlay for development debugging
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Build Process**: Vite for frontend bundling, ESBuild for backend compilation