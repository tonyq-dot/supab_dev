'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { MobileNav } from './MobileNav';

export function Header() {
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <Link href="/">LumaLance</Link>
        </h1>
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="/projects" className="hover:underline">Projects</Link>
          <Link href="/freelancers" className="hover:underline">Freelancers</Link>
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </nav>
        <div className="hidden md:flex items-center space-x-4">
          {loading ? (
            <div className="text-sm opacity-75">Loading...</div>
          ) : user ? (
            <>
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <button 
                onClick={handleLogout}
                className="hover:underline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">Login</Link>
              <Link href="/register" className="bg-white text-primary px-4 py-2 rounded-md hover:bg-opacity-90">Sign Up</Link>
            </>
          )}
        </div>
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
} 