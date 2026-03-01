/**
 * API client for making requests to the backend
 */

// Base URL for API requests - use relative URL to work with any domain
const API_BASE_URL = '/api';

// Default headers for API requests
const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

// Interface for API request options
interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
  refreshAttempted?: boolean;
}

// Interface for API response
interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Get authentication token from local storage
 */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

/**
 * Get refresh token from local storage
 */
const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
};

/**
 * Set authentication token in local storage
 */
export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

/**
 * Set refresh token in local storage
 */
export const setRefreshToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('refreshToken', token);
};

/**
 * Remove authentication token from local storage
 */
export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

/**
 * Remove refresh token from local storage
 */
export const removeRefreshToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('refreshToken');
};

/**
 * Clear all auth tokens from local storage
 */
export const clearAuthTokens = (): void => {
  removeToken();
  removeRefreshToken();
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      clearAuthTokens();
      return false;
    }
    
    const data = await response.json();
    
    if (data.accessToken && data.refreshToken) {
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAuthTokens();
    return false;
  }
};

/**
 * Make an API request
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  try {
    const {
      method = 'GET',
      headers = {},
      body,
      requiresAuth = false,
    } = options;

    // Prepare headers
    const requestHeaders = { ...defaultHeaders, ...headers };

    // Add authentication token if required
    if (requiresAuth) {
      const token = getToken();
      if (!token) {
        // Try to refresh the token
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          return {
            data: null,
            error: 'Authentication required',
            status: 401,
          };
        }
        
        // Get the new token
        const newToken = getToken();
        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`;
        } else {
          return {
            data: null,
            error: 'Authentication required',
            status: 401,
          };
        }
      } else {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Add request body if provided
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    const status = response.status;

    // Parse response data
    let data = null;
    let error = null;

    try {
      data = await response.json();
    } catch (e) {
      // Response is not JSON
    }

    // Handle error responses
    if (!response.ok) {
      // If unauthorized and token refresh hasn't been attempted yet
      if (status === 401 && requiresAuth && !options.hasOwnProperty('refreshAttempted')) {
        // Try to refresh the token
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the request with the new token
          return apiRequest(endpoint, { ...options, refreshAttempted: true });
        }
      }
      
      error = data?.message || 'An error occurred';
      data = null;
    }

    return { data, error, status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 500,
    };
  }
};

/**
 * API client with convenience methods for common operations
 */
const api = {
  // Auth endpoints
  auth: {
    register: (userData: any) => apiRequest('/auth/register', {
      method: 'POST',
      body: userData,
    }),
    login: (credentials: { email: string; password: string }) => apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
    }),
    me: () => apiRequest('/auth/me', { requiresAuth: true }),
    refreshToken: (refreshToken: string) => apiRequest('/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken },
    }),
    requestPasswordReset: (email: string) => apiRequest('/auth/request-password-reset', {
      method: 'POST',
      body: { email },
    }),
    resetPassword: (token: string, newPassword: string) => apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),
    logout: (refreshToken: string) => apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      requiresAuth: true,
    }),
  },

  // Google OAuth endpoints
  google: {
    getAuthUrl: () => apiRequest('/google/auth/url'),
    authCallback: (data: { idToken: string }) => apiRequest('/google/auth/callback', {
      method: 'POST',
      body: data,
    }),
    linkAccount: (data: { idToken: string }) => apiRequest('/google/auth/link', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    unlinkAccount: () => apiRequest('/google/auth/unlink', {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Projects endpoints
  projects: {
    getAll: (params?: any) => apiRequest('/projects', {
      requiresAuth: false,
    }),
    getById: (id: string) => apiRequest(`/projects/${id}`, {
      requiresAuth: false,
    }),
    getBySlug: (slug: string) => apiRequest(`/projects/slug/${slug}`, {
      requiresAuth: false,
    }),
    create: (projectData: any) => apiRequest('/projects', {
      method: 'POST',
      body: projectData,
      requiresAuth: true,
    }),
    update: (id: string, projectData: any) => apiRequest(`/projects/${id}`, {
      method: 'PUT',
      body: projectData,
      requiresAuth: true,
    }),
    delete: (id: string) => apiRequest(`/projects/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
    getUserProjects: (params?: any) => apiRequest('/projects/user/client', {
      requiresAuth: true,
    }),
  },

  // Proposals endpoints
  proposals: {
    getForProject: (projectId: string, params?: any) => apiRequest(`/proposals/project/${projectId}`, {
      requiresAuth: true,
    }),
    getUserProposals: (params?: any) => apiRequest('/proposals/user', {
      requiresAuth: true,
    }),
    getById: (id: string) => apiRequest(`/proposals/${id}`, {
      requiresAuth: true,
    }),
    create: (proposalData: any) => apiRequest('/proposals', {
      method: 'POST',
      body: proposalData,
      requiresAuth: true,
    }),
    update: (id: string, proposalData: any) => apiRequest(`/proposals/${id}`, {
      method: 'PUT',
      body: proposalData,
      requiresAuth: true,
    }),
    updateStatus: (id: string, status: string) => apiRequest(`/proposals/${id}/status`, {
      method: 'PUT',
      body: { status },
      requiresAuth: true,
    }),
    delete: (id: string) => apiRequest(`/proposals/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Categories endpoints
  categories: {
    getAll: () => apiRequest('/categories', {
      requiresAuth: false,
    }),
    getById: (id: string) => apiRequest(`/categories/${id}`, {
      requiresAuth: false,
    }),
    getBySlug: (slug: string) => apiRequest(`/categories/slug/${slug}`, {
      requiresAuth: false,
    }),
    create: (categoryData: any) => apiRequest('/categories', {
      method: 'POST',
      body: categoryData,
      requiresAuth: true,
    }),
    update: (id: string, categoryData: any) => apiRequest(`/categories/${id}`, {
      method: 'PUT',
      body: categoryData,
      requiresAuth: true,
    }),
    delete: (id: string) => apiRequest(`/categories/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Skills endpoints
  skills: {
    getAll: (params?: any) => apiRequest('/skills', {
      requiresAuth: false,
    }),
    getById: (id: string) => apiRequest(`/skills/${id}`, {
      requiresAuth: false,
    }),
    getBySlug: (slug: string) => apiRequest(`/skills/slug/${slug}`, {
      requiresAuth: false,
    }),
    create: (skillData: any) => apiRequest('/skills', {
      method: 'POST',
      body: skillData,
      requiresAuth: true,
    }),
    update: (id: string, skillData: any) => apiRequest(`/skills/${id}`, {
      method: 'PUT',
      body: skillData,
      requiresAuth: true,
    }),
    delete: (id: string) => apiRequest(`/skills/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
    getUserSkills: () => apiRequest('/skills/user/profile', {
      requiresAuth: true,
    }),
    addUserSkill: (skillData: any) => apiRequest('/skills/user/profile', {
      method: 'POST',
      body: skillData,
      requiresAuth: true,
    }),
    updateUserSkill: (skillId: string, proficiencyLevel: number) => apiRequest(`/skills/user/profile/${skillId}`, {
      method: 'PUT',
      body: { proficiency_level: proficiencyLevel },
      requiresAuth: true,
    }),
    removeUserSkill: (skillId: string) => apiRequest(`/skills/user/profile/${skillId}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Users endpoints
  users: {
    getProfile: (id: string) => apiRequest(`/users/${id}/profile`, {
      requiresAuth: false,
    }),
    getCurrentProfile: () => apiRequest('/users/profile', {
      requiresAuth: true,
    }),
    updateProfile: (profileData: any) => apiRequest('/users/profile', {
      method: 'PUT',
      body: profileData,
      requiresAuth: true,
    }),
    uploadAvatar: (formData: FormData) => {
      // Create custom headers without Content-Type to let the browser set it with the boundary
      const headers: Record<string, string> = {};
      
      return fetch(`${API_BASE_URL}/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
        body: formData,
      }).then(async (response) => {
        const status = response.status;
        let data = null;
        let error = null;
        
        try {
          data = await response.json();
        } catch (e) {
          // Response is not JSON
        }
        
        if (!response.ok) {
          error = data?.message || 'An error occurred';
          data = null;
        }
        
        return { data, error, status };
      }).catch(error => ({
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
        status: 500,
      }));
    },
  },

  // Telegram endpoints
  telegram: {
    auth: (telegramData: any) => apiRequest('/telegram/auth', {
      method: 'POST',
      body: telegramData,
    }),
    link: (telegramData: any) => apiRequest('/telegram/link', {
      method: 'POST',
      body: telegramData,
      requiresAuth: true,
    }),
    getWidgetData: () => apiRequest('/telegram/widget-data'),
    getStatus: () => apiRequest('/telegram/status', {
      requiresAuth: true,
    }),
  },

  // Messages endpoints
  messages: {
    getConversations: () => apiRequest('/messages/conversations', {
      requiresAuth: true,
    }),
    getConversation: (id: string) => apiRequest(`/messages/conversations/${id}`, {
      requiresAuth: true,
    }),
    getMessages: (conversationId: string, limit = 50, offset = 0) => apiRequest(`/messages/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
      requiresAuth: true,
    }),
    createConversation: (data: any) => apiRequest('/messages/conversations', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    sendMessage: (conversationId: string, content: string) => apiRequest(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content },
      requiresAuth: true,
    }),
    markAsRead: (conversationId: string) => apiRequest(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
      requiresAuth: true,
    }),
    getUnreadCount: () => apiRequest('/messages/unread-count', {
      requiresAuth: true,
    }),
  },

  // Milestones endpoints
  milestones: {
    getProjectMilestones: (projectId: string | number) => apiRequest(`/milestones/project/${projectId}`, {
      requiresAuth: true,
    }),
    getById: (id: string | number) => apiRequest(`/milestones/${id}`, {
      requiresAuth: true,
    }),
    create: (data: any) => apiRequest('/milestones', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    update: (id: string | number, data: any) => apiRequest(`/milestones/${id}`, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }),
    updateStatus: (id: string | number, status: string) => apiRequest(`/milestones/${id}/status`, {
      method: 'PUT',
      body: { status },
      requiresAuth: true,
    }),
    delete: (id: string | number) => apiRequest(`/milestones/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Notifications endpoints
  notifications: {
    getAll: (params?: any) => apiRequest(`/notifications${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    getUnreadCount: () => apiRequest('/notifications/unread-count', {
      requiresAuth: true,
    }),
    markAsRead: (id: string) => apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
      requiresAuth: true,
    }),
    markAllAsRead: () => apiRequest('/notifications/read-all', {
      method: 'PUT',
      requiresAuth: true,
    }),
    delete: (id: string) => apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Payments endpoints
  payments: {
    getAll: (params?: any) => apiRequest(`/payments${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    getById: (id: string) => apiRequest(`/payments/${id}`, {
      requiresAuth: true,
    }),
    getByMilestone: (milestoneId: string) => apiRequest(`/payments/milestone/${milestoneId}`, {
      requiresAuth: true,
    }),
    updateStatus: (id: string, data: any) => apiRequest(`/payments/${id}/status`, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }),
    getStats: () => apiRequest('/payments/stats', {
      requiresAuth: true,
    }),
    getPaymentMethods: () => apiRequest('/payments/payment-methods', {
      requiresAuth: true,
    }),
    createPaymentMethod: (data: any) => apiRequest('/payments/payment-methods', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    updatePaymentMethod: (id: string, data: any) => apiRequest(`/payments/payment-methods/${id}`, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }),
    deletePaymentMethod: (id: string) => apiRequest(`/payments/payment-methods/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    }),
  },

  // Points endpoints
  points: {
    getBalance: () => apiRequest('/points/balance', {
      requiresAuth: true,
    }),
    getTransactions: (params?: any) => apiRequest(`/points/transactions${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    getAchievements: () => apiRequest('/points/achievements', {
      requiresAuth: true,
    }),
    transfer: (data: any) => apiRequest('/points/transfer', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    getLeaderboard: (params?: any) => apiRequest(`/points/leaderboard${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    mint: (data: any) => apiRequest('/points/mint', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    checkAchievements: (data: any) => apiRequest('/points/check-achievements', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
  },

  // Fiat Rewards endpoints
  fiatRewards: {
    getSummary: () => apiRequest('/fiat-rewards/summary', {
      requiresAuth: true,
    }),
    getRewards: (params?: any) => apiRequest(`/fiat-rewards/rewards${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    getTransactions: (params?: any) => apiRequest(`/fiat-rewards/transactions${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    getCategories: () => apiRequest('/fiat-rewards/categories', {
      requiresAuth: true,
    }),
    getLeaderboard: (params?: any) => apiRequest(`/fiat-rewards/leaderboard${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    award: (data: any) => apiRequest('/fiat-rewards/award', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
    markPaid: (id: string, data: any) => apiRequest(`/fiat-rewards/${id}/mark-paid`, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }),
    checkAchievements: (data: any) => apiRequest('/fiat-rewards/check-achievements', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
  },

  // Analytics endpoints
  analytics: {
    getAdminOverview: () => apiRequest('/analytics/admin/overview', {
      requiresAuth: true,
    }),
    getFreelancerEarnings: (params?: any) => apiRequest(`/analytics/freelancer/earnings${params ? `?${new URLSearchParams(params).toString()}` : ''}`, {
      requiresAuth: true,
    }),
    getFreelancerPerformance: () => apiRequest('/analytics/freelancer/performance', {
      requiresAuth: true,
    }),
  },

  // Generic request method for custom endpoints
  request: apiRequest,
};

export default api;
