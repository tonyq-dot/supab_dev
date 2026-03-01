import React, { useState } from 'react';
import api from '@/lib/api/client';

interface ProjectStatusManagerProps {
  projectId: number | string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

// Define status transitions and their descriptions
const statusTransitions: Record<string, { next: string[], label: string, description: string, color: string }> = {
  'draft': {
    next: ['active', 'cancelled'],
    label: 'Draft',
    description: 'Project is in draft mode and not visible to freelancers',
    color: 'bg-gray-100 text-gray-800'
  },
  'active': {
    next: ['in-progress', 'cancelled'],
    label: 'Active',
    description: 'Project is open for proposals from freelancers',
    color: 'bg-green-100 text-green-800'
  },
  'in-progress': {
    next: ['completed', 'cancelled'],
    label: 'In Progress',
    description: 'Project has been assigned to a freelancer and is being worked on',
    color: 'bg-blue-100 text-blue-800'
  },
  'completed': {
    next: [],
    label: 'Completed',
    description: 'Project has been successfully completed',
    color: 'bg-purple-100 text-purple-800'
  },
  'cancelled': {
    next: [],
    label: 'Cancelled',
    description: 'Project has been cancelled',
    color: 'bg-red-100 text-red-800'
  }
};

export default function ProjectStatusManager({ 
  projectId, 
  currentStatus, 
  onStatusChange,
  className = ''
}: ProjectStatusManagerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get current status info
  const statusInfo = statusTransitions[status] || {
    next: [],
    label: 'Unknown',
    description: 'Unknown status',
    color: 'bg-gray-100 text-gray-800'
  };
  
  // Handle status change request
  const handleStatusChangeRequest = (newStatus: string) => {
    setPendingStatus(newStatus);
    setShowConfirmation(true);
  };
  
  // Handle status change confirmation
  const handleConfirmStatusChange = async () => {
    if (!pendingStatus) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      const response = await api.projects.update(projectId.toString(), {
        status: pendingStatus
      });
      
      if (response.error) {
        setError(response.error);
      } else {
        // Update local state
        setStatus(pendingStatus);
        
        // Notify parent component
        if (onStatusChange) {
          onStatusChange(pendingStatus);
        }
      }
    } catch (err) {
      console.error('Error updating project status:', err);
      setError('Failed to update project status');
    } finally {
      setUpdating(false);
      setShowConfirmation(false);
      setPendingStatus(null);
    }
  };
  
  // Get pending status info
  const getPendingStatusInfo = () => {
    if (!pendingStatus) return null;
    
    return statusTransitions[pendingStatus] || {
      label: 'Unknown',
      description: 'Unknown status',
      color: 'bg-gray-100 text-gray-800'
    };
  };
  
  const pendingStatusInfo = getPendingStatusInfo();
  
  return (
    <div className={`project-status-manager ${className}`}>
      {/* Current Status Display */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Current Status</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
        <p className="text-sm text-gray-600 mt-1">{statusInfo.description}</p>
      </div>
      
      {/* Status Change Options */}
      {statusInfo.next.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Change Status</h3>
          <div className="flex flex-wrap gap-2">
            {statusInfo.next.map((nextStatus) => {
              const nextStatusInfo = statusTransitions[nextStatus];
              return (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusChangeRequest(nextStatus)}
                  className={`px-3 py-1 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  disabled={updating}
                >
                  {nextStatusInfo.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmation && pendingStatusInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Status Change</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to change the project status from 
              <span className={`mx-1 px-2 py-0.5 rounded ${statusInfo.color}`}>{statusInfo.label}</span>
              to
              <span className={`mx-1 px-2 py-0.5 rounded ${pendingStatusInfo.color}`}>{pendingStatusInfo.label}</span>?
            </p>
            
            <p className="text-sm text-gray-500 mb-4">{pendingStatusInfo.description}</p>
            
            {pendingStatus === 'active' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-md text-sm mb-4">
                This will make your project visible to all freelancers who can submit proposals.
              </div>
            )}
            
            {pendingStatus === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
                This action cannot be undone. Cancelling the project will notify all freelancers who have submitted proposals.
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setPendingStatus(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
