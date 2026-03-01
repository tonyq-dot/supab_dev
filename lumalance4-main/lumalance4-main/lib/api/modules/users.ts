import { BaseApiClient } from '../core/base';
import { 
  User, 
  UserProfile,
  ProfileFormData,
  ApiResponse 
} from '@/types';
import { SkillsUpdateData, ContactInfoData } from '@/lib/validations';

export class UsersAPI extends BaseApiClient {
  constructor() {
    super('/users');
  }

  /**
   * Get user profile by ID
   */
  async getProfile(id: string | number): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>(`/${id}/profile`);
  }

  /**
   * Get current user's profile
   */
  async getCurrentProfile(): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>('/profile', true);
  }

  /**
   * Update current user's profile
   */
  async updateProfile(profileData: Partial<ProfileFormData>): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>('/profile', profileData, true);
  }

  /**
   * Update contact information
   */
  async updateContactInfo(contactData: ContactInfoData): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>('/profile/contact', contactData, true);
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar_url: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    // Override the default request method to handle file upload
    return this.request<{ avatar_url: string }>('/profile/avatar', {
      method: 'POST',
      body: formData,
      requiresAuth: true,
      headers: {}, // Let browser set Content-Type with boundary
    });
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>('/profile/avatar', true);
  }

  /**
   * Get user's skills
   */
  async getSkills(): Promise<ApiResponse<{ id: number; name: string; proficiency_level: number }[]>> {
    return this.get<{ id: number; name: string; proficiency_level: number }[]>('/profile/skills', true);
  }

  /**
   * Update user's skills
   */
  async updateSkills(skillsData: SkillsUpdateData): Promise<ApiResponse<{ message: string }>> {
    return this.put<{ message: string }>('/profile/skills', skillsData, true);
  }

  /**
   * Add a skill to user's profile
   */
  async addSkill(skillId: number, proficiencyLevel: number): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/profile/skills', { 
      skill_id: skillId, 
      proficiency_level: proficiencyLevel 
    }, true);
  }

  /**
   * Update skill proficiency level
   */
  async updateSkillProficiency(skillId: number, proficiencyLevel: number): Promise<ApiResponse<{ message: string }>> {
    return this.put<{ message: string }>(`/profile/skills/${skillId}`, { 
      proficiency_level: proficiencyLevel 
    }, true);
  }

  /**
   * Remove a skill from user's profile
   */
  async removeSkill(skillId: number): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/profile/skills/${skillId}`, true);
  }

  /**
   * Get user's portfolio items
   */
  async getPortfolio(): Promise<ApiResponse<{
    id: number;
    title: string;
    description: string;
    image_url?: string;
    project_url?: string;
    created_at: string;
  }[]>> {
    return this.get<{
      id: number;
      title: string;
      description: string;
      image_url?: string;
      project_url?: string;
      created_at: string;
    }[]>('/profile/portfolio', true);
  }

  /**
   * Add portfolio item
   */
  async addPortfolioItem(portfolioData: {
    title: string;
    description: string;
    image_url?: string;
    project_url?: string;
  }): Promise<ApiResponse<{ id: number; message: string }>> {
    return this.post<{ id: number; message: string }>('/profile/portfolio', portfolioData, true);
  }

  /**
   * Update portfolio item
   */
  async updatePortfolioItem(id: number, portfolioData: {
    title?: string;
    description?: string;
    image_url?: string;
    project_url?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.put<{ message: string }>(`/profile/portfolio/${id}`, portfolioData, true);
  }

  /**
   * Delete portfolio item
   */
  async deletePortfolioItem(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/profile/portfolio/${id}`, true);
  }

  /**
   * Get user's reviews
   */
  async getReviews(userId?: number): Promise<ApiResponse<{
    id: number;
    rating: number;
    comment: string;
    reviewer: { id: number; name: string };
    project: { id: number; title: string };
    created_at: string;
  }[]>> {
    const endpoint = userId ? `/${userId}/reviews` : '/profile/reviews';
    return this.get<{
      id: number;
      rating: number;
      comment: string;
      reviewer: { id: number; name: string };
      project: { id: number; title: string };
      created_at: string;
    }[]>(endpoint, true);
  }

  /**
   * Get user statistics
   */
  async getStats(userId?: number): Promise<ApiResponse<{
    total_projects: number;
    completed_projects: number;
    success_rate: number;
    average_rating: number;
    total_earnings: number;
    member_since: string;
  }>> {
    const endpoint = userId ? `/${userId}/stats` : '/profile/stats';
    return this.get<{
      total_projects: number;
      completed_projects: number;
      success_rate: number;
      average_rating: number;
      total_earnings: number;
      member_since: string;
    }>(endpoint, true);
  }

  /**
   * Search users
   */
  async search(query: string, filters?: {
    skills?: number[];
    location?: string;
    availability?: 'available' | 'busy' | 'unavailable';
    min_rating?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    data: UserProfile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const searchParams = new URLSearchParams({ search: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => searchParams.append(key, item.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    
    return this.get<{
      data: UserProfile[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/search?${searchParams.toString()}`);
  }
} 