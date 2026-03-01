import { BaseApiClient, createQueryString } from '../core/base';
import { 
  Project, 
  ProjectFilters, 
  ProjectFormData,
  PaginatedResponse,
  ApiResponse 
} from '@/types';

export class ProjectsAPI extends BaseApiClient {
  constructor() {
    super('/projects');
  }

  /**
   * Get all projects with optional filters
   */
  async getAll(filters?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const queryString = filters ? createQueryString(filters) : '';
    const endpoint = queryString ? `?${queryString}` : '';
    return this.get<PaginatedResponse<Project>>(endpoint, false, true, 'projects');
  }

  /**
   * Get project by ID
   */
  async getById(id: string | number): Promise<ApiResponse<Project>> {
    return this.get<Project>(`/${id}`, false, true, 'projects');
  }

  /**
   * Get project by slug
   */
  async getBySlug(slug: string): Promise<ApiResponse<Project>> {
    return this.get<Project>(`/slug/${slug}`, false, true, 'projects');
  }

  /**
   * Create a new project
   */
  async create(projectData: ProjectFormData): Promise<ApiResponse<Project>> {
    const result = await this.post<Project>('', projectData, true);
    if (result.success) {
      this.invalidateCache();
    }
    return result;
  }

  /**
   * Update an existing project
   */
  async update(id: string | number, projectData: Partial<ProjectFormData>): Promise<ApiResponse<Project>> {
    const result = await this.put<Project>(`/${id}`, projectData, true);
    if (result.success) {
      this.invalidateCache();
    }
    return result;
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string | number): Promise<ApiResponse<{ message: string }>> {
    const result = await this.delete<{ message: string }>(`/${id}`, true);
    if (result.success) {
      this.invalidateCache();
    }
    return result;
  }

  /**
   * Get projects for the current user (as client)
   */
  async getUserProjects(filters?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const queryString = filters ? createQueryString(filters) : '';
    const endpoint = `/user/client${queryString ? `?${queryString}` : ''}`;
    return this.get<PaginatedResponse<Project>>(endpoint, true);
  }

  /**
   * Get projects where user is freelancer
   */
  async getFreelancerProjects(filters?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const queryString = filters ? createQueryString(filters) : '';
    const endpoint = `/user/freelancer${queryString ? `?${queryString}` : ''}`;
    return this.get<PaginatedResponse<Project>>(endpoint, true);
  }

  /**
   * Update project status
   */
  async updateStatus(id: string | number, status: string): Promise<ApiResponse<Project>> {
    return this.put<Project>(`/${id}/status`, { status }, true);
  }

  /**
   * Get project statistics
   */
  async getStats(): Promise<ApiResponse<{
    total: number;
    open: number;
    in_progress: number;
    completed: number;
    closed: number;
    disputed: number;
  }>> {
    return this.get<{
      total: number;
      open: number;
      in_progress: number;
      completed: number;
      closed: number;
      disputed: number;
    }>('/stats');
  }

  /**
   * Search projects
   */
  async search(query: string, filters?: Omit<ProjectFilters, 'search'>): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const searchFilters = { ...filters, search: query };
    const queryString = createQueryString(searchFilters);
    return this.get<PaginatedResponse<Project>>(`/search?${queryString}`);
  }

  /**
   * Get featured projects
   */
  async getFeatured(limit = 10): Promise<ApiResponse<Project[]>> {
    return this.get<Project[]>(`/featured?limit=${limit}`);
  }

  /**
   * Get recent projects
   */
  async getRecent(limit = 10): Promise<ApiResponse<Project[]>> {
    return this.get<Project[]>(`/recent?limit=${limit}`);
  }

  /**
   * Get projects by category
   */
  async getByCategory(categoryId: number, filters?: Omit<ProjectFilters, 'category_id'>): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const categoryFilters = { ...filters, category_id: categoryId };
    const queryString = createQueryString(categoryFilters);
    return this.get<PaginatedResponse<Project>>(`/category/${categoryId}?${queryString}`);
  }

  /**
   * Get projects requiring specific skills
   */
  async getBySkills(skillIds: number[], filters?: Omit<ProjectFilters, 'skills'>): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const skillFilters = { ...filters, skills: skillIds };
    const queryString = createQueryString(skillFilters);
    return this.get<PaginatedResponse<Project>>(`/skills?${queryString}`);
  }

  /**
   * Get project skills
   */
  async getSkills(id: string | number): Promise<ApiResponse<{ id: number; name: string; slug: string }[]>> {
    return this.get<{ id: number; name: string; slug: string }[]>(`/${id}/skills`);
  }

  /**
   * Update project skills
   */
  async updateSkills(id: string | number, skillIds: number[]): Promise<ApiResponse<{ message: string }>> {
    return this.put<{ message: string }>(`/${id}/skills`, { skills: skillIds }, true);
  }
} 