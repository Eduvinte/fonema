import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { AppLayout } from '../pages/AppLayout';
import { LoginPage, RegisterPage } from '../features/auth/AuthPages';
import { SectionsPage } from '../features/sections/SectionsPage';
import { NewSectionPage } from '../features/sections/NewSectionPage';
import { SectionDetailPage } from '../features/sections/SectionDetailPage';
import { BillingPage } from '../features/billing/BillingPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <SectionsPage /> },
      { path: 'nueva', element: <NewSectionPage /> },
      { path: 's/:id', element: <SectionDetailPage /> },
      { path: 'billing', element: <BillingPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
