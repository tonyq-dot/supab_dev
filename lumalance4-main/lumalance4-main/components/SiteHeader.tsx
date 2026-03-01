"use client"

import Link from "next/link"
import { Bell, Menu, Plus, Search, User, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/lib/components/ui/Button"
import { Input } from "@/lib/components/ui/Input"
import { useAuth } from "@/lib/auth/AuthContext"

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link href="/" className="font-bold text-xl">
            LUMALANCE
          </Link>

          <div className="hidden md:flex ml-6">
            <Input type="search" placeholder="Find freelance services..." className="w-[300px]" />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            className="md:hidden"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label={isSearchOpen ? "Close search" : "Open search"}
          >
            <Search className="h-5 w-5" />
          </button>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/projects" className="text-sm font-medium hover:text-primary transition-colors">
              Projects
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </Link>
            {!isAuthenticated ? (
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                Sign In
              </Link>
            ) : (
              <button
                onClick={handleLogout}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Logout
              </button>
            )}
          </nav>

          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </Button>

              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          )}

          {isAuthenticated ? (
            <Button className="hidden md:inline-flex" asChild>
              <Link href="/dashboard">
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button className="hidden md:inline-flex" asChild>
              <Link href="/register">
                <Plus className="h-4 w-4 mr-2" /> Get Started
              </Link>
            </Button>
          )}

          <Button className="md:hidden" size="icon" asChild>
            <Link href={isAuthenticated ? "/dashboard" : "/register"}>
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      {isSearchOpen && (
        <div className="md:hidden p-4 border-b">
          <Input type="search" placeholder="Find freelance services..." className="w-full" />
        </div>
      )}

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-b">
          <nav className="flex flex-col p-4 gap-4">
            <Link
              href="/projects"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Projects
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
            {isAuthenticated && (
              <div className="border-t pt-4 mt-2 flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/profile">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
} 