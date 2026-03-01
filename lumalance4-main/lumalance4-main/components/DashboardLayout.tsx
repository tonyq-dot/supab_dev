'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import NotificationBell from './NotificationBell';
import PointsDisplay from './PointsDisplay';
import FiatRewardsDisplay from './FiatRewardsDisplay';
import { Gift, Shield } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Projects', href: '/dashboard/projects' },
    { name: 'Proposals', href: '/dashboard/proposals' },
    { name: 'Messages', href: '/dashboard/messages' },
    // { name: 'Whiteboards', href: '/dashboard/whiteboards' }, // Disabled for now
    { name: 'Payments', href: '/dashboard/payments' },
    { name: 'Earnings', href: '/dashboard/earnings' },
    { name: 'Points', href: '/dashboard/points' },
    { name: 'Rewards', href: '/dashboard/rewards' },
    { name: 'Notifications', href: '/dashboard/notifications' },
    ...(user?.is_admin ? [{ name: 'Admin', href: '/dashboard/admin' }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-primary-600">
                LumaLance
              </Link>
              
              <nav className="hidden md:flex space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center space-x-4">
              {/* Fiat Rewards Display */}
              <FiatRewardsDisplay className="px-3 py-1 bg-green-50 rounded-full border border-green-200" />
              {/* Points Display */}
              <PointsDisplay className="px-3 py-1 bg-yellow-50 rounded-full border border-yellow-200" />
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.profile?.display_name || user?.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.is_admin ? 'Admin' : 'User'}
                  </div>
                </div>
                
                <div className="relative">
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-4 overflow-x-auto py-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(item.href)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 