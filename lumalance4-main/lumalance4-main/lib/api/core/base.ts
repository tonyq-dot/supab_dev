import { ApiResponse, ApiError } from '@/types';
import { apiCache, invalidateRelatedCaches } from './cache';

// Base URL for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4420/api';

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
  useCache?: boolean;
  cacheType?: 'static' | 'user' | 'projects' | 'search' | 'realtime';
  cacheTTL?: number;
}

/**
 * Get authentication token from local storage
 */
const getToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('token') || undefined;
};

/**
 * Get refresh token from local storage
 */
const getRefreshToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('refreshToken') || undefined;
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
export const setRefreshToken = (refreshToken: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Clear authentication tokens from local storage
 */
export const clearAuthTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
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
 * Base API request function
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
      useCache = false,
      cacheType = 'projects',
      cacheTTL,
    } = options;

    // Check cache for GET requests
    if (method === 'GET' && useCache) {
      const cached = apiCache[cacheType].get<T>(endpoint);
      if (cached !== undefined) {
        return {
          success: true,
          data: cached,
          error: undefined,
        };
      }
    }

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
            success: false,
            error: 'Authentication required',
            data: undefined,
          };
        }
        
        // Get the new token
        const newToken = getToken();
        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`;
        } else {
          return {
            success: false,
            error: 'Authentication required',
            data: undefined,
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

    // Parse response data
    let data: T | undefined = undefined;
    let error: string | undefined = undefined;

    try {
      data = await response.json();
    } catch (e) {
      // Response is not JSON
    }

    // Handle error responses
    if (!response.ok) {
      // If unauthorized and token refresh hasn't been attempted yet
      if (response.status === 401 && requiresAuth && !options.hasOwnProperty('refreshAttempted')) {
        // Try to refresh the token
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the request with the new token
          return apiRequest(endpoint, { ...options, refreshAttempted: true });
        }
      }
      
      error = (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`;
      return {
        success: false,
        error,
        data: undefined,
      };
    }

    // Cache successful GET responses
    if (method === 'GET' && useCache && data !== undefined) {
      apiCache[cacheType].set(endpoint, data, undefined, cacheTTL);
    }

    return {
      success: true,
      data,
      error: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
};

/**
 * Base API client class
 */
export abstract class BaseApiClient {
  protected basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const fullEndpoint = `${this.basePath}${endpoint}`;
    return apiRequest<T>(fullEndpoint, options);
  }

  protected async get<T>(endpoint: string, requiresAuth = false, useCache = false, cacheType: 'static' | 'user' | 'projects' | 'search' | 'realtime' = 'projects'): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth, useCache, cacheType });
  }

  protected async post<T>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth });
  }

  protected async put<T>(
    endpoint: string,
    body?: any,
    requiresAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresAuth });
  }

  protected async delete<T>(
    endpoint: string,
    requiresAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  /**
   * Invalidate cache for this API module
   */
  protected invalidateCache(pattern?: string): void {
    const cachePattern = pattern || this.basePath;
    Object.values(apiCache).forEach(cache => {
      cache.invalidate(cachePattern);
    });
  }

  /**
   * Clear all caches
   */
  protected clearAllCaches(): void {
    Object.values(apiCache).forEach(cache => {
      cache.clear();
    });
  }
}

/**
 * Create query string from parameters
 */
export const createQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
}; 