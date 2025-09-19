# Business Directory - Bahrain

A modern, responsive business directory and review platform built with React 19, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🏠 **Home/Discover Page** - Hero search, category browsing, featured businesses
- 🔍 **Advanced Search** - Filters, sorting, list/map views
- 🏢 **Business Profiles** - Detailed business information, reviews, media gallery
- 👤 **User Authentication** - Sign in/up, guest mode, role-based access
- 📋 **Lists & Favorites** - Save businesses to custom lists
- 🔔 **Notifications** - Customizable notification preferences
- 👨‍💼 **Business Owner Tools** - Claim business, register new business, dashboard
- 🛠️ **Admin Console** - User management, listing approval, review moderation
- 💰 **Pricing Plans** - Subscription management with mock payments
- 🌍 **Internationalization** - English and Arabic support with RTL
- 🎨 **Modern UI** - Dark/light theme, responsive design, accessibility

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Notifications**: Sonner

## Demo Limitations

This is a frontend-only demo with the following limitations:
- No real backend or database
- Mock API with simulated latency
- SSO, OTP, and payments are disabled
- All data is stored locally in JSON files

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                 # Route layouts
├── components/          # Reusable UI components
├── features/           # Domain-specific features
├── pages/              # Route components
├── store/              # Zustand state management
├── lib/                # Utilities and API
├── i18n/               # Internationalization
├── data/               # Mock data (JSON files)
└── assets/             # Static assets
```

## Key Features Implemented

### ✅ Completed
- Project setup with Vite + React 19 + TypeScript
- Tailwind CSS configuration with shadcn/ui
- Core UI components (Button, Card, Input, etc.)
- Zustand state management with persistence
- React Router with nested layouts
- i18n system (English/Arabic) with RTL support
- Mock API with realistic Bahrain business data
- Home page with search and featured content
- Search page with filters and sorting
- Business profile pages with tabs
- Authentication pages (Sign In/Up/OTP)
- Account management (Lists, Notifications)
- Owner tools (Claim, Register, Dashboard)
- Admin console with management features
- Pricing page with subscription modal
- Responsive design and accessibility basics

### 🎯 Demo Features
- **Guest Mode**: Continue without signing up
- **Role Switching**: Test different user roles (guest, user, owner, admin)
- **Theme Toggle**: Switch between light and dark modes
- **Language Toggle**: Switch between English and Arabic
- **Mock Data**: Realistic Bahrain business listings
- **Interactive UI**: All buttons and forms are functional
- **Responsive**: Works on mobile, tablet, and desktop

## Data

The application uses realistic mock data focused on Bahrain:
- 5 sample businesses across different categories
- Categories: Restaurants, Shopping, Healthcare, Beauty, Automotive
- Reviews and ratings for each business
- User profiles with different roles
- Admin data for pricing plans and moderation

## Contributing

This is a demo project showcasing modern React development practices. Feel free to explore the code and use it as a reference for your own projects.

## License

MIT License - feel free to use this code for learning and reference purposes.