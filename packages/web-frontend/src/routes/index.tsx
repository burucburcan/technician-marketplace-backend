import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layouts/MainLayout';
import { AuthLayout } from '../components/layouts/AuthLayout';
import { DashboardLayout } from '../components/layouts/DashboardLayout';

// Auth pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';

// Public pages
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';
import { ProfessionalDetailPage } from '../pages/ProfessionalDetailPage';

// User pages
import { UserDashboardPage } from '../pages/user/DashboardPage';
import { UserBookingsPage } from '../pages/user/BookingsPage';
import { UserProfilePage } from '../pages/user/ProfilePage';

// Professional pages
import { ProfessionalDashboardPage } from '../pages/professional/DashboardPage';
import { ProfessionalBookingsPage } from '../pages/professional/BookingsPage';
import { ProfessionalProfilePage } from '../pages/professional/ProfilePage';
import { PortfolioManagementPage } from '../pages/professional/PortfolioManagementPage';

// Provider pages
import { ProviderDashboardPage } from '../pages/provider/DashboardPage';
import { ProviderProfessionalsPage } from '../pages/provider/ProfessionalsPage';

// Admin pages
import { AdminDashboardPage } from '../pages/admin/DashboardPage';
import { AdminUsersPage } from '../pages/admin/UsersPage';
import { AdminProfessionalsPage } from '../pages/admin/ProfessionalsPage';
import { AdminCategoriesPage } from '../pages/admin/CategoriesPage';
import { AdminPortfoliosPage } from '../pages/admin/PortfoliosPage';
import { AdminDisputesPage } from '../pages/admin/DisputesPage';

// Shared pages
import { BookingDetailPage } from '../pages/BookingDetailPage';
import { PaymentPage } from '../pages/PaymentPage';
import { MessagesPage } from '../pages/MessagesPage';
import { NotificationsPage } from '../pages/NotificationsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'professional/:id', element: <ProfessionalDetailPage /> },
      { path: 'booking/:id', element: <BookingDetailPage /> },
      { path: 'payment/:bookingId', element: <PaymentPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/user',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <UserDashboardPage /> },
      { path: 'bookings', element: <UserBookingsPage /> },
      { path: 'profile', element: <UserProfilePage /> },
    ],
  },
  {
    path: '/professional',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <ProfessionalDashboardPage /> },
      { path: 'bookings', element: <ProfessionalBookingsPage /> },
      { path: 'profile', element: <ProfessionalProfilePage /> },
      { path: 'portfolio', element: <PortfolioManagementPage /> },
    ],
  },
  {
    path: '/provider',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <ProviderDashboardPage /> },
      { path: 'professionals', element: <ProviderProfessionalsPage /> },
    ],
  },
  {
    path: '/admin',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'professionals', element: <AdminProfessionalsPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'portfolios', element: <AdminPortfoliosPage /> },
      { path: 'disputes', element: <AdminDisputesPage /> },
    ],
  },
]);
