# Technician Marketplace Platform - Mobile Frontend

React Native mobile application for the Technician Marketplace Platform, built with Expo.

## Features

- **Authentication**: Login, register, email verification, password reset
- **Professional Search**: Search for technicians and artists by category, location, and type
- **Artist Portfolios**: View artist portfolios with image galleries
- **Booking Management**: Create, view, and manage service bookings
- **Real-time Messaging**: Chat with professionals about bookings
- **Push Notifications**: Receive updates about bookings and messages
- **Payment Integration**: Secure payments with Stripe (with/without invoice)
- **Location Services**: Find nearby professionals using GPS
- **Multi-language Support**: Spanish and English

## Tech Stack

- **React Native** 0.73.2
- **Expo** ~50.0.0
- **TypeScript** 5.3.3
- **Redux Toolkit** + RTK Query for state management
- **React Navigation** for routing
- **Axios** for API calls

## Project Structure

```
src/
├── navigation/       # Navigation configuration
├── screens/          # Screen components
│   ├── auth/        # Authentication screens
│   ├── home/        # Home and search screens
│   ├── booking/     # Booking management screens
│   ├── messaging/   # Chat screens
│   ├── payment/     # Payment screens
│   └── profile/     # Profile screens
├── store/           # Redux store configuration
│   ├── api.ts       # RTK Query API setup
│   ├── slices/      # Redux slices
│   └── index.ts     # Store configuration
├── components/      # Reusable components
├── services/        # API services
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your API keys and configuration

### Development

Start the development server:
```bash
npm run dev
```

Run on iOS:
```bash
npm run ios
```

Run on Android:
```bash
npm run android
```

Run on web:
```bash
npm run web
```

### Testing

Run tests:
```bash
npm test
```

### Building

Build for production:
```bash
npm run build
```

## Environment Variables

See `.env.example` for required environment variables:

- `EXPO_PUBLIC_API_URL`: Backend API URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key for location services
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for payments
- Firebase configuration for push notifications

## API Integration

The app integrates with the backend API using RTK Query. All API endpoints are defined in `src/store/api.ts` and organized by feature.

## State Management

- **Redux Toolkit**: Global state management
- **RTK Query**: API calls and caching
- **React Navigation**: Navigation state

## Supported Platforms

- iOS 13+
- Android 5.0+
- Web (limited support)

## License

Private - Technician Marketplace Platform
