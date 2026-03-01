// Export core utilities
export { 
  setToken, 
  setRefreshToken, 
  clearAuthTokens, 
  refreshAccessToken, 
  apiRequest,
  createQueryString 
} from './core/base';

// Import API modules
import { AuthAPI } from './modules/auth';
import { ProjectsAPI } from './modules/projects';
import { ProposalsAPI } from './modules/proposals';
import { UsersAPI } from './modules/users';

// Create API client instances
export const api = {
  auth: new AuthAPI(),
  projects: new ProjectsAPI(),
  proposals: new ProposalsAPI(),
  users: new UsersAPI(),
};

// Export individual API classes for advanced usage
export { AuthAPI, ProjectsAPI, ProposalsAPI, UsersAPI };

// Export types
export type { ApiResponse, ApiError } from '@/types';

// Default export for backward compatibility
export default api; 