'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import TaskRecommendations from '@/components/llm-assistant/TaskRecommendations';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Loading...</h2>
          <p className="mt-2 text-muted-foreground">Please wait while we load your dashboard</p>
        </div>
      </div>
    );
  }

  // Show dashboard only if user is authenticated
  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Projects Card */}
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h3 className="text-lg font-medium mb-2">Your Projects</h3>
            <p className="text-muted-foreground mt-2">Manage your projects and view proposals</p>
            <div className="mt-4 space-y-2">
              <Link 
                href="/dashboard/projects" 
                className="inline-block w-full px-4 py-2 bg-primary text-white rounded-md text-sm text-center"
              >
                Manage Projects
              </Link>
              <Link 
                href="/dashboard/projects/new" 
                className="inline-block w-full px-4 py-2 border border-primary text-primary bg-transparent rounded-md text-sm text-center"
              >
                Create New Project
              </Link>
            </div>
          </div>

          {/* Proposals Card */}
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h3 className="text-lg font-medium mb-2">Your Proposals</h3>
            <p className="text-muted-foreground mt-2">Track your submitted proposals</p>
            <div className="mt-4 space-y-2">
              <Link 
                href="/dashboard/proposals" 
                className="inline-block w-full px-4 py-2 bg-primary text-white rounded-md text-sm text-center"
              >
                View My Proposals
              </Link>
              <Link 
                href="/projects" 
                className="inline-block w-full px-4 py-2 border border-primary text-primary bg-transparent rounded-md text-sm text-center"
              >
                Find Projects
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h3 className="text-lg font-medium mb-2">Active Milestones</h3>
            <p className="text-3xl font-bold">0</p>
            <p className="text-muted-foreground mt-2">No active milestones</p>
            <Link 
              href="/dashboard/milestones" 
              className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md text-sm"
            >
              View Milestones
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                href="/dashboard/projects"
                className="p-4 border border-border rounded-md hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-medium">My Projects</h3>
                <p className="text-sm text-muted-foreground mt-1">Manage your created projects</p>
              </Link>
              <Link 
                href="/dashboard/proposals"
                className="p-4 border border-border rounded-md hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-medium">My Proposals</h3>
                <p className="text-sm text-muted-foreground mt-1">Track your submitted proposals</p>
              </Link>
              <Link 
                href="/dashboard/messages"
                className="p-4 border border-border rounded-md hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-medium">Messages</h3>
                <p className="text-sm text-muted-foreground mt-1">Communicate with clients and freelancers</p>
              </Link>
              <Link 
                href="/projects"
                className="p-4 border border-border rounded-md hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-medium">Find Projects</h3>
                <p className="text-sm text-muted-foreground mt-1">Browse available projects</p>
              </Link>
              <Link 
                href="/profile"
                className="p-4 border border-border rounded-md hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-medium">My Profile</h3>
                <p className="text-sm text-muted-foreground mt-1">Update your profile information</p>
              </Link>
              <Link 
                href="/assistant"
                className="p-4 border border-border rounded-md hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-medium">AI Assistant</h3>
                <p className="text-sm text-muted-foreground mt-1">Get help with your projects and tasks</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Task Recommendations */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Task Recommendations</h2>
          <TaskRecommendations className="w-full" />
        </div>

        {/* Profile Completion */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Your profile is incomplete</h3>
                <p className="text-muted-foreground mt-1">
                  Complete your profile to increase your chances of getting hired
                </p>
              </div>
              <Link 
                href="/profile" 
                className="px-4 py-2 bg-primary text-white rounded-md text-sm"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
