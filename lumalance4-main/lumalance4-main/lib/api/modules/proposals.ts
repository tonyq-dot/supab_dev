import { BaseApiClient, createQueryString } from '../core/base';
import { 
  Proposal, 
  ProposalFilters, 
  ProposalFormData,
  PaginatedResponse,
  ApiResponse 
} from '@/types';

export class ProposalsAPI extends BaseApiClient {
  constructor() {
    super('/proposals');
  }

  /**
   * Get all proposals with optional filters
   */
  async getAll(filters?: ProposalFilters): Promise<ApiResponse<PaginatedResponse<Proposal>>> {
    const queryString = filters ? createQueryString(filters) : '';
    const endpoint = queryString ? `?${queryString}` : '';
    return this.get<PaginatedResponse<Proposal>>(endpoint, true);
  }

  /**
   * Get proposal by ID
   */
  async getById(id: string | number): Promise<ApiResponse<Proposal>> {
    return this.get<Proposal>(`/${id}`, true);
  }

  /**
   * Get proposals for a specific project
   */
  async getForProject(projectId: string | number, filters?: Omit<ProposalFilters, 'project_id'>): Promise<ApiResponse<PaginatedResponse<Proposal>>> {
    const projectFilters = { ...filters, project_id: Number(projectId) };
    const queryString = createQueryString(projectFilters);
    return this.get<PaginatedResponse<Proposal>>(`/project/${projectId}?${queryString}`, true);
  }

  /**
   * Get proposals for the current user (as freelancer)
   */
  async getUserProposals(filters?: ProposalFilters): Promise<ApiResponse<PaginatedResponse<Proposal>>> {
    const queryString = filters ? createQueryString(filters) : '';
    const endpoint = `/user${queryString ? `?${queryString}` : ''}`;
    return this.get<PaginatedResponse<Proposal>>(endpoint, true);
  }

  /**
   * Create a new proposal
   */
  async create(proposalData: ProposalFormData & { project_id: number }): Promise<ApiResponse<Proposal>> {
    return this.post<Proposal>('', proposalData, true);
  }

  /**
   * Update an existing proposal
   */
  async update(id: string | number, proposalData: Partial<ProposalFormData>): Promise<ApiResponse<Proposal>> {
    return this.put<Proposal>(`/${id}`, proposalData, true);
  }

  /**
   * Delete a proposal
   */
  async deleteProposal(id: string | number): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/${id}`, true);
  }

  /**
   * Update proposal status
   */
  async updateStatus(id: string | number, status: string): Promise<ApiResponse<Proposal>> {
    return this.put<Proposal>(`/${id}/status`, { status }, true);
  }

  /**
   * Accept a proposal
   */
  async accept(id: string | number, message?: string): Promise<ApiResponse<Proposal>> {
    return this.post<Proposal>(`/${id}/accept`, { message }, true);
  }

  /**
   * Reject a proposal
   */
  async reject(id: string | number, message?: string): Promise<ApiResponse<Proposal>> {
    return this.post<Proposal>(`/${id}/reject`, { message }, true);
  }

  /**
   * Withdraw a proposal
   */
  async withdraw(id: string | number): Promise<ApiResponse<Proposal>> {
    return this.post<Proposal>(`/${id}/withdraw`, {}, true);
  }

  /**
   * Get proposal statistics
   */
  async getStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  }>> {
    return this.get<{
      total: number;
      pending: number;
      accepted: number;
      rejected: number;
      withdrawn: number;
    }>('/stats', true);
  }

  /**
   * Get proposals by freelancer
   */
  async getByFreelancer(freelancerId: number, filters?: Omit<ProposalFilters, 'freelancer_id'>): Promise<ApiResponse<PaginatedResponse<Proposal>>> {
    const freelancerFilters = { ...filters, freelancer_id: freelancerId };
    const queryString = createQueryString(freelancerFilters);
    return this.get<PaginatedResponse<Proposal>>(`/freelancer/${freelancerId}?${queryString}`, true);
  }

  /**
   * Check if user can propose to project
   */
  async canPropose(projectId: string | number): Promise<ApiResponse<{ canPropose: boolean; reason?: string }>> {
    return this.get<{ canPropose: boolean; reason?: string }>(`/can-propose/${projectId}`, true);
  }

  /**
   * Get user's proposal for a specific project
   */
  async getUserProposalForProject(projectId: string | number): Promise<ApiResponse<Proposal | null>> {
    return this.get<Proposal | null>(`/user/project/${projectId}`, true);
  }
} 