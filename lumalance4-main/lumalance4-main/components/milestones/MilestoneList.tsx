'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Gift, DollarSign } from 'lucide-react';

interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_email?: string;
  created_by_display_name?: string;
}

interface Payment {
  id: number;
  status: string;
  paid_at: string | null;
  due_date: string | null;
}

interface MilestoneListProps {
  projectId: number | string;
  onMilestoneStatusChange?: (milestone: Milestone) => void;
}

export default function MilestoneList({ projectId, onMilestoneStatusChange }: MilestoneListProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [payments, setPayments] = useState<Record<number, Payment>>({});
  const [userRole, setUserRole] = useState<'client' | 'freelancer' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for new milestone
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    amount: 0,
    due_date: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch milestones and payments
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.milestones.getProjectMilestones(projectId);
        
        if (response.data) {
          setMilestones(response.data.milestones);
          setUserRole(response.data.user_role);
          
          // Fetch payments for each milestone
          const paymentPromises = response.data.milestones.map(async (milestone: Milestone) => {
            try {
              const paymentResponse = await api.payments.getByMilestone(milestone.id.toString());
              if (paymentResponse.data) {
                return { milestoneId: milestone.id, payment: paymentResponse.data };
              }
            } catch (err) {
              console.error(`Error fetching payment for milestone ${milestone.id}:`, err);
            }
            return null;
          });
          
          const paymentResults = await Promise.all(paymentPromises);
          const paymentMap: Record<number, Payment> = {};
          
          paymentResults.forEach(result => {
            if (result) {
              paymentMap[result.milestoneId] = result.payment;
            }
          });
          
          setPayments(paymentMap);
        } else {
          setError(response.error || 'Failed to fetch milestones');
        }
      } catch (err) {
        setError('An error occurred while fetching milestones');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewMilestone(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMilestone.title || newMilestone.amount <= 0) {
      setError('Please provide a title and a valid amount');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await api.milestones.create({
        project_id: Number(projectId),
        title: newMilestone.title,
        description: newMilestone.description || undefined,
        amount: Number(newMilestone.amount),
        due_date: newMilestone.due_date || undefined
      });
      
      if (response.data) {
        // Add the new milestone to the list
        setMilestones(prev => [...prev, response.data.milestone]);
        
        // Reset form
        setNewMilestone({
          title: '',
          description: '',
          amount: 0,
          due_date: ''
        });
        
        // Hide form
        setShowAddForm(false);
      } else {
        setError(response.error || 'Failed to create milestone');
      }
    } catch (err) {
      setError('An error occurred while creating the milestone');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle milestone status change
  const handleStatusChange = async (milestone: Milestone, newStatus: 'pending' | 'in-progress' | 'completed' | 'cancelled') => {
    try {
      const response = await api.milestones.updateStatus(milestone.id, newStatus);
      
      if (response.data) {
        // Update milestone in the list
        setMilestones(prev => 
          prev.map(m => m.id === milestone.id ? response.data.milestone : m)
        );
        
        // Show fiat rewards notification if milestone was completed
        if (newStatus === 'completed' && userRole === 'freelancer') {
          // Check for fiat rewards
          try {
            const rewardsResponse = await api.fiatRewards.checkAchievements({
              category_type: 'milestone_completion',
              criteria: { milestone_count: 1 }
            });
            
            if (rewardsResponse.data && rewardsResponse.data.new_rewards.length > 0) {
              // Show success message with rewards info
              const totalReward = rewardsResponse.data.new_rewards.reduce((sum: number, reward: any) => sum + reward.fiat_reward, 0);
              alert(`🎉 Milestone completed! You earned ${formatCurrency(totalReward)} in fiat rewards! Check your rewards dashboard for details.`);
            }
          } catch (rewardsErr) {
            console.error('Error checking fiat rewards:', rewardsErr);
          }
        }
        
        // Call the callback if provided
        if (onMilestoneStatusChange) {
          onMilestoneStatusChange(response.data.milestone);
        }
      } else {
        setError(response.error || 'Failed to update milestone status');
      }
    } catch (err) {
      setError('An error occurred while updating the milestone status');
      console.error(err);
    }
  };
  
  // Handle milestone deletion
  const handleDelete = async (milestoneId: number) => {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await api.milestones.delete(milestoneId);
      
      if (!response.error) {
        // Remove milestone from the list
        setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('An error occurred while deleting the milestone');
      console.error(err);
    }
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format status text
  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get payment status badge
  const getPaymentStatusBadge = (milestoneId: number) => {
    const payment = payments[milestoneId];
    if (!payment) return null;
    
    switch (payment.status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            💰 Paid
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏰ Due
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ⏳ Pending
          </span>
        );
      default:
        return null;
    }
  };
  
  // Check if user can change milestone status
  const canChangeStatus = (milestone: Milestone, newStatus: string) => {
    if (!userRole) return false;
    
    if (userRole === 'client') {
      // Client can mark as completed or cancelled
      return newStatus === 'completed' || newStatus === 'cancelled';
    } else if (userRole === 'freelancer') {
      // Freelancer can mark as in-progress
      return newStatus === 'in-progress';
    }
    
    return false;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Milestones</h2>
        {userRole === 'client' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {showAddForm ? 'Cancel' : 'Add Milestone'}
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {/* Add milestone form */}
      {showAddForm && userRole === 'client' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-4">Add New Milestone</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={newMilestone.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={newMilestone.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={newMilestone.amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={newMilestone.due_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {submitting ? 'Adding...' : 'Add Milestone'}
            </button>
          </div>
        </form>
      )}
      
      {/* Milestones list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-gray-600">Loading milestones...</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No milestones yet</h3>
          <p className="text-gray-500">
            {userRole === 'client' 
              ? 'Add milestones to track project progress and payments' 
              : 'The client has not added any milestones yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{milestone.title}</h3>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(milestone.status)}`}>
                        {formatStatus(milestone.status)}
                      </span>
                      {getPaymentStatusBadge(milestone.id) && (
                        <>
                          <span className="mx-2 text-gray-300">•</span>
                          {getPaymentStatusBadge(milestone.id)}
                        </>
                      )}
                      {milestone.due_date && (
                        <>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            Due: {formatDate(milestone.due_date)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(milestone.amount)}
                    </div>
                    {payments[milestone.id] && (
                      <div className="text-sm text-gray-500 mt-1">
                        {payments[milestone.id].status === 'paid' && payments[milestone.id].paid_at && (
                          <>Paid: {formatDate(payments[milestone.id].paid_at!)}</>
                        )}
                        {payments[milestone.id].status === 'due' && payments[milestone.id].due_date && (
                          <>Due: {formatDate(payments[milestone.id].due_date!)}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {milestone.description && (
                  <div className="mt-4">
                    <p className="text-gray-700">{milestone.description}</p>
                  </div>
                )}
                
                <div className="mt-6 flex flex-wrap justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Created {formatDate(milestone.created_at)}
                    {milestone.created_by_display_name && (
                      <> by {milestone.created_by_display_name}</>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 mt-2 sm:mt-0">
                    {/* Status change buttons */}
                    {milestone.status === 'pending' && canChangeStatus(milestone, 'in-progress') && (
                      <button
                        onClick={() => handleStatusChange(milestone, 'in-progress')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Start Work
                      </button>
                    )}
                    
                    {milestone.status === 'in-progress' && canChangeStatus(milestone, 'completed') && (
                      <button
                        onClick={() => handleStatusChange(milestone, 'completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Mark Complete
                      </button>
                    )}
                    
                    {(milestone.status === 'pending' || milestone.status === 'in-progress') && 
                     canChangeStatus(milestone, 'cancelled') && (
                      <button
                        onClick={() => handleStatusChange(milestone, 'cancelled')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Cancel
                      </button>
                    )}
                    
                    {/* Delete button (client only) */}
                    {userRole === 'client' && milestone.status === 'pending' && (
                      <button
                        onClick={() => handleDelete(milestone.id)}
                        className="px-3 py-1 border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
