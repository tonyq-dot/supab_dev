'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface Proposal {
  id: number;
  cover_letter: string;
  price: number;
  estimated_duration: number;
  status: string;
  created_at: string;
  updated_at: string;
  project_title: string;
  project_slug: string;
  project_description: string;
  project_budget: number;
  project_deadline: string;
  project_status: string;
  client_display_name: string;
  client_avatar_url: string;
}

function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProposals, setTotalProposals] = useState(0);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 10;

  // Edit states
  const [editingProposal, setEditingProposal] = useState<number | null>(null);
  const [editCoverLetter, setEditCoverLetter] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/proposals');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const fetchProposals = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        
        if (selectedStatus) {
          params.append('status', selectedStatus);
        }
        
        params.append('limit', proposalsPerPage.toString());
        params.append('offset', ((currentPage - 1) * proposalsPerPage).toString());
        
        const response = await api.request(`/proposals/user?${params.toString()}`);
        
        if (response.data) {
          setProposals(response.data.proposals);
          setTotalProposals(response.data.pagination.total);
        } else {
          setError(response.error || 'Failed to fetch proposals');
        }
      } catch (err) {
        setError('An error occurred while fetching proposals');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposals();
  }, [selectedStatus, currentPage, isAuthenticated]);

  const handleStatusFilter = () => {
    const params = new URLSearchParams();
    if (selectedStatus) {
      params.append('status', selectedStatus);
    }
    setCurrentPage(1);
    router.push(`/dashboard/proposals?${params.toString()}`);
  };

  const resetFilters = () => {
    setSelectedStatus('');
    setCurrentPage(1);
    router.push('/dashboard/proposals');
  };

  const startEditing = (proposal: Proposal) => {
    setEditingProposal(proposal.id);
    setEditCoverLetter(proposal.cover_letter);
    setEditPrice(proposal.price ? proposal.price.toString() : '');
    setEditDuration(proposal.estimated_duration ? proposal.estimated_duration.toString() : '');
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingProposal(null);
    setEditCoverLetter('');
    setEditPrice('');
    setEditDuration('');
    setEditError(null);
  };

  const handleUpdateProposal = async (proposalId: number) => {
    setSubmitting(true);
    setEditError(null);
    
    try {
      const response = await api.proposals.update(proposalId.toString(), {
        cover_letter: editCoverLetter,
        price: editPrice ? parseFloat(editPrice) : undefined,
        estimated_duration: editDuration ? parseInt(editDuration) : undefined
      });
      
      if (response.error) {
        setEditError(response.error);
      } else {
        // Update the proposal in the list
        setProposals(prev => prev.map(p => 
          p.id === proposalId ? { ...p, ...response.data } : p
        ));
        cancelEditing();
      }
    } catch (err) {
      setEditError('An error occurred while updating the proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProposal = async (proposalId: number) => {
    if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await api.proposals.delete(proposalId.toString());
      
      if (response.error) {
        setError(response.error);
      } else {
        // Remove the proposal from the list
        setProposals(prev => prev.filter(p => p.id !== proposalId));
        setTotalProposals(prev => prev - 1);
      }
    } catch (err) {
      setError('An error occurred while deleting the proposal');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      accepted: { color: 'bg-green-100 text-green-800', text: 'Accepted' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const calculateTotalPages = () => Math.ceil(totalProposals / proposalsPerPage);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Proposals</h1>
        <Link
          href="/projects"
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Find More Projects
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={handleStatusFilter}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Apply Filter
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No proposals found</h3>
          <p className="text-gray-500 mb-4">You haven't submitted any proposals yet.</p>
          <Link
            href="/projects"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Browse Projects
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    <Link href={`/projects/${proposal.project_slug}`} className="text-primary-600 hover:text-primary-700">
                      {proposal.project_title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mb-2">{proposal.project_description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(proposal.price)}</p>
                  {getStatusBadge(proposal.status)}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <img
                      src={proposal.client_avatar_url || '/default-avatar.png'}
                      alt={proposal.client_display_name}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span className="text-sm text-gray-600">{proposal.client_display_name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Submitted {formatDate(proposal.created_at)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {proposal.estimated_duration} days estimated
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Cover Letter:</h4>
                {editingProposal === proposal.id ? (
                  <textarea
                    value={editCoverLetter}
                    onChange={(e) => setEditCoverLetter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-700">{proposal.cover_letter}</p>
                )}
              </div>
              
              {editingProposal === proposal.id && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
              
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                  {editError}
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                {editingProposal === proposal.id ? (
                  <>
                    <button
                      onClick={() => handleUpdateProposal(proposal.id)}
                      disabled={submitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(proposal)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProposal(proposal.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {calculateTotalPages() > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {Array.from({ length: calculateTotalPages() }, (_, i) => i + 1).map((page) => (
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
              onClick={() => setCurrentPage(Math.min(calculateTotalPages(), currentPage + 1))}
              disabled={currentPage === calculateTotalPages()}
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

export default function FreelancerProposalsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Proposals</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ProposalsContent />
    </Suspense>
  );
}
