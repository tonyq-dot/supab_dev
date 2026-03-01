"use client";

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2"
        aria-label="Toggle navigation"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Slide-out drawer */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-background transform transition-transform md:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Navigation items go here */}
        <nav className="flex flex-col p-4">
          <a href="/dashboard" className="p-2 hover:bg-muted rounded-md">Dashboard</a>
          <a href="/projects" className="p-2 hover:bg-muted rounded-md">Projects</a>
          <a href="/profile" className="p-2 hover:bg-muted rounded-md">Profile</a>
        </nav>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
} 