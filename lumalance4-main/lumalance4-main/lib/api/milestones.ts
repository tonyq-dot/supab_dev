import api from './client';

/**
 * Get all milestones for a project
 * @param projectId - The ID of the project
 * @returns Promise with the milestones data
 */
export const getProjectMilestones = async (projectId: string | number) => {
  return api.request(`/milestones/project/${projectId}`, { requiresAuth: true });
};

/**
 * Get a milestone by ID
 * @param id - The ID of the milestone
 * @returns Promise with the milestone data
 */
export const getMilestone = async (id: string | number) => {
  return api.request(`/milestones/${id}`, { requiresAuth: true });
};

/**
 * Create a new milestone
 * @param data - The milestone data
 * @returns Promise with the created milestone
 */
export const createMilestone = async (data: {
  project_id: number;
  title: string;
  description?: string;
  amount: number;
  due_date?: string;
}) => {
  return api.request('/milestones', {
    method: 'POST',
    body: data,
    requiresAuth: true
  });
};

/**
 * Update a milestone
 * @param id - The ID of the milestone
 * @param data - The milestone data to update
 * @returns Promise with the updated milestone
 */
export const updateMilestone = async (
  id: string | number,
  data: {
    title?: string;
    description?: string;
    amount?: number;
    due_date?: string;
  }
) => {
  return api.request(`/milestones/${id}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true
  });
};

/**
 * Update milestone status
 * @param id - The ID of the milestone
 * @param status - The new status ('pending', 'in-progress', 'completed', 'cancelled')
 * @returns Promise with the updated milestone
 */
export const updateMilestoneStatus = async (
  id: string | number,
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
) => {
  return api.request(`/milestones/${id}/status`, {
    method: 'PUT',
    body: { status },
    requiresAuth: true
  });
};

/**
 * Delete a milestone
 * @param id - The ID of the milestone
 * @returns Promise with the deletion result
 */
export const deleteMilestone = async (id: string | number) => {
  return api.request(`/milestones/${id}`, {
    method: 'DELETE',
    requiresAuth: true
  });
};

const milestoneApi = {
  getProjectMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone
};

export default milestoneApi;
