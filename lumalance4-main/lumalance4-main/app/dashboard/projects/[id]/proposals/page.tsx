'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Proposal {
  id: number;
  project_id: number;
  freelancer_id: number;
  cover_letter: string;
  price: number;
  estimated_duration: number;
  status: string;
  created_at: string;
  updated_at: string;
  freelancer_email: string;
  freelancer_first_name: string;
  freelancer_last_name: string;
  freelancer_display_name: string;
  freelancer_avatar_url: string;
}

interface Project {
  id: number;
  title: string;
  slug: string;
  status: string;
  client_id: number;
}

export default function ProjectProposalsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // State
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [processingAction, setProcessingAction] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Fetch project and proposals
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch project details
        const projectResponse = await api.projects.getById(id as string);
        
        if (projectResponse.error) {
          setError(projectResponse.error);
          setLoading(false);
          return;
        }
        
        const projectData = projectResponse.data;
        
        // Check if user is the project owner
        if (user && projectData.client_id !== user.id && !user.is_admin) {
          setError('You do not have permission to view proposals for this project');
          setLoading(false);
          return;
        }
        
        setProject(projectData);
        
        // Fetch proposals for the project
        const proposalsResponse = await api.proposals.getForProject(id as string);
        
        if (proposalsResponse.error) {
          setError(proposalsResponse.error);
        } else {
          setProposals(proposalsResponse.data.proposals || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && id) {
      fetchData();
    }
  }, [id, isAuthenticated, user]);
  
  // Handle proposal action (accept/reject)
  const handleProposalAction = async (proposalId: number, action: 'accepted' | 'rejected') => {
    setProcessingAction(proposalId);
    setActionError(null);
    
    try {
      const response = await api.proposals.updateStatus(proposalId.toString(), action);
      
      if (response.error) {
        setActionError(response.error);
      } else {
        // Update local state
        setProposals(prevProposals => 
          prevProposals.map(proposal => 
            proposal.id === proposalId
              ? { ...proposal, status: action }
              : proposal.status === 'pending' && action === 'accepted'
                ? { ...proposal, status: 'rejected' } // Reject all other pending proposals if one is accepted
                : proposal
          )
        );
        
        // Close proposal detail if open
        if (showProposalDetail && selectedProposal?.id === proposalId) {
          setSelectedProposal({ ...selectedProposal, status: action });
        }
      }
    } catch (err) {
      console.error('Error updating proposal status:', err);
      setActionError('An error occurred while updating proposal status');
    } finally {
      setProcessingAction(null);
    }
  };
  
  // Handle view proposal detail
  const handleViewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowProposalDetail(true);
  };
  
  // Filter proposals by status
  const filteredProposals = statusFilter === 'all'
    ? proposals
    : proposals.filter(proposal => proposal.status === statusFilter);
  
  // Count proposals by status
  const proposalCounts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === 'pending').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    rejected: proposals.filter(p => p.status === 'rejected').length
  };
  
  if (authLoading || loading) {
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
    return null; // Will redirect to login
  }
  
  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error || 'Project not found'}
        </div>
        <Link href="/dashboard" className="text-primary-600 hover:text-primary-800">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/dashboard" className="text-primary-600 hover:text-primary-800">
          ← Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Proposals for "{project.title}"</h1>
            <p className="text-gray-500 mt-1">
              {proposalCounts.all} {proposalCounts.all === 1 ? 'proposal' : 'proposals'} received
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link
              href={`/projects/${project.slug}`}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              View Project
            </Link>
          </div>
        </div>
        
        {/* Status filter tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setStatusFilter('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                statusFilter === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All ({proposalCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                statusFilter === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending ({proposalCounts.pending})
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                statusFilter === 'accepted'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Accepted ({proposalCounts.accepted})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                statusFilter === 'rejected'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected ({proposalCounts.rejected})
            </button>
          </nav>
        </div>
        
        {/* Action error message */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {actionError}
          </div>
        )}
        
        {/* Proposals list */}
        {filteredProposals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No {statusFilter !== 'all' ? statusFilter : ''} proposals found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProposals.map((proposal) => (
              <div 
                key={proposal.id} 
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex items-center">
                      {proposal.freelancer_avatar_url ? (
                        <Image
                          src={proposal.freelancer_avatar_url}
                          alt={proposal.freelancer_display_name || 'Freelancer'}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {(proposal.freelancer_display_name || 'F').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {proposal.freelancer_display_name || proposal.freelancer_email}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Submitted {formatDate(proposal.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col items-end">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(proposal.price)}
                      </div>
                      {proposal.estimated_duration && (
                        <p className="text-sm text-gray-600">
                          Estimated: {proposal.estimated_duration} {proposal.estimated_duration === 1 ? 'day' : 'days'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-gray-700 line-clamp-3">
                      {proposal.cover_letter}
                    </p>
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        proposal.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : proposal.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-4 sm:mt-0 flex space-x-3">
                      <button
                        onClick={() => handleViewProposal(proposal)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        View Details
                      </button>
                      
                      {proposal.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleProposalAction(proposal.id, 'accepted')}
                            disabled={!!processingAction}
                            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {processingAction === proposal.id ? 'Processing...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleProposalAction(proposal.id, 'rejected')}
                            disabled={!!processingAction}
                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            {processingAction === proposal.id ? 'Processing...' : 'Reject'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Proposal detail modal */}
      {showProposalDetail && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  {selectedProposal.freelancer_avatar_url ? (
                    <Image
                      src={selectedProposal.freelancer_avatar_url}
                      alt={selectedProposal.freelancer_display_name || 'Freelancer'}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 text-xl">
                        {(selectedProposal.freelancer_display_name || 'F').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedProposal.freelancer_display_name || selectedProposal.freelancer_email}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Submitted {formatDate(selectedProposal.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProposalDetail(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Price</h3>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(selectedProposal.price)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estimated Duration</h3>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {selectedProposal.estimated_duration} {selectedProposal.estimated_duration === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    selectedProposal.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedProposal.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedProposal.status.charAt(0).toUpperCase() + selectedProposal.status.slice(1)}
                  </span>
                </p>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Cover Letter</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-700 whitespace-pre-line">{selectedProposal.cover_letter}</p>
                </div>
              </div>
              
              {selectedProposal.status === 'pending' && (
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      handleProposalAction(selectedProposal.id, 'rejected');
                    }}
                    disabled={!!processingAction}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {processingAction === selectedProposal.id ? 'Processing...' : 'Reject Proposal'}
                  </button>
                  <button
                    onClick={() => {
                      handleProposalAction(selectedProposal.id, 'accepted');
                    }}
                    disabled={!!processingAction}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {processingAction === selectedProposal.id ? 'Processing...' : 'Accept Proposal'}
                  </button>
                </div>
              )}
              
              {selectedProposal.status === 'accepted' && (
                <div className="mt-8 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                  <p className="font-medium">This proposal has been accepted.</p>
                  <p className="mt-1">The project is now in progress. You can manage milestones from the project page.</p>
                </div>
              )}
              
              {selectedProposal.status === 'rejected' && (
                <div className="mt-8 bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-md">
                  <p>This proposal has been rejected.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
