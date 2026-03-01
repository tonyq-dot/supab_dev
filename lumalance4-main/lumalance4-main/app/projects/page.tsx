'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  budget: number;
  deadline: string;
  status: string;
  created_at: string;
  client_display_name: string;
  client_avatar_url: string;
  skills: Skill[];
  categories: Category[];
  proposal_count: number;
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

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProjects, setTotalProjects] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSkill, setSelectedSkill] = useState(searchParams.get('skill') || '');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 10;
  
  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await api.categories.getAll();
        if (response.data) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    
    // Fetch skills
    const fetchSkills = async () => {
      try {
        const response = await api.skills.getAll();
        if (response.data) {
          setSkills(response.data);
        }
      } catch (err) {
        console.error('Error fetching skills:', err);
      }
    };
    
    fetchCategories();
    fetchSkills();
  }, []);
  
  useEffect(() => {
    // Fetch projects with filters
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
        
        if (selectedSkill) {
          params.append('skill', selectedSkill);
        }
        
        // Add pagination
        params.append('limit', projectsPerPage.toString());
        params.append('offset', ((currentPage - 1) * projectsPerPage).toString());
        
        // Fetch projects
        const response = await api.request(`/projects?${params.toString()}`);
        
        if (response.data) {
          setProjects(response.data.projects);
          setTotalProjects(response.data.pagination.total);
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
  }, [searchTerm, selectedCategory, selectedSkill, currentPage]);
  
  // Apply filters
  const applyFilters = () => {
    // Update URL with filters
    const params = new URLSearchParams();
    
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    
    if (selectedCategory) {
      params.append('category', selectedCategory);
    }
    
    if (selectedSkill) {
      params.append('skill', selectedSkill);
    }
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Update URL
    router.push(`/projects?${params.toString()}`);
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSkill('');
    setCurrentPage(1);
    router.push('/projects');
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(totalProjects / projectsPerPage);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Find Projects</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          {/* Category filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Skill filter */}
          <div>
            <label htmlFor="skill" className="block text-sm font-medium text-gray-700 mb-1">
              Skill
            </label>
            <select
              id="skill"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Skills</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.slug}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reset
          </button>
        </div>
      </div>
      
      {/* Projects List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No projects found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    <Link href={`/projects/${project.slug}`} className="text-primary-600 hover:text-primary-700">
                      {project.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mb-2">{project.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(project.budget)}</p>
                  <p className="text-sm text-gray-500">{project.status}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <img
                      src={project.client_avatar_url || '/default-avatar.png'}
                      alt={project.client_display_name}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span className="text-sm text-gray-600">{project.client_display_name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Posted {formatDate(project.created_at)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {project.proposal_count} proposals
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {project.categories.map((category) => (
                  <span
                    key={category.id}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {project.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                  >
                    {skill.name}
                  </span>
                ))}
                {project.skills.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    +{project.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 border rounded-md ${
                  currentPage === page
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Find Projects</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
