'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  budget: number;
  deadline: string;
  status: string;
  created_at: string;
  skills: Skill[];
  categories: Category[];
  proposal_stats: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
}

interface Skill {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function DashboardProjectsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/projects');
    }
  }, [isAuthenticated, isLoading, router]);
  
  useEffect(() => {
    const fetchProjects = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        
        if (activeTab !== 'all') {
          params.append('status', activeTab);
        }
        
        const response = await api.projects.getUserProjects(params.toString());
        
        if (response.data) {
          setProjects(response.data.projects);
        } else {
          setError(response.error || 'Failed to fetch projects');
        }
      } catch (err) {
        setError('An error occurred while fetching projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [isAuthenticated, activeTab]);
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <Link
          href="/dashboard/projects/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Create New Project
        </Link>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'draft'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('in-progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'in-progress'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed
          </button>
        </nav>
      </div>
      
      {/* Projects list */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-medium text-gray-700 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'all'
                ? "You haven't created any projects yet."
                : `You don't have any ${activeTab.replace('-', ' ')} projects.`}
            </p>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Create Your First Project
            </Link>
          </div>
        ) : (
          <>
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div>
                      <div className="flex items-center">
                        <Link href={`/projects/${project.slug}`} className="text-xl font-semibold text-primary-700 hover:text-primary-800">
                          {project.title}
                        </Link>
                        <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(project.status)}`}>
                          {formatStatus(project.status)}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">
                        Created {formatDate(project.created_at)}
                      </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {project.budget ? formatCurrency(project.budget) : 'Budget not specified'}
                      </div>
                      {project.deadline && (
                        <p className="text-sm text-gray-600">
                          Due by {formatDate(project.deadline)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <p className="mt-2 text-gray-700">
                    {project.description?.length > 150
                      ? `${project.description.substring(0, 150)}...`
                      : project.description || 'No description provided'}
                  </p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.categories?.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800"
                      >
                        {category.name}
                      </span>
                    ))}
                    {project.skills?.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex flex-wrap justify-between items-center">
                    <div className="flex space-x-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">{project.proposal_stats?.total || 0}</span> proposals
                      </div>
                      {project.proposal_stats?.pending > 0 && (
                        <div>
                          <span className="font-medium text-yellow-600">{project.proposal_stats.pending}</span> pending
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                      <Link
                        href={`/dashboard/projects/${project.id}/proposals`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        View Proposals
                      </Link>
                      <Link
                        href={`/dashboard/projects/${project.id}/edit`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        View Public Page
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
