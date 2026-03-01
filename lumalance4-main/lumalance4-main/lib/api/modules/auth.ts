import { BaseApiClient } from '../core/base';
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  LoginResponse,
  ApiResponse 
} from '@/types';

export class AuthAPI extends BaseApiClient {
  constructor() {
    super('/auth');
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<ApiResponse<User>> {
    return this.post<User>('/register', userData);
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/login', credentials);
  }

  /**
   * Get current user profile
   */
  async me(): Promise<ApiResponse<User>> {
    return this.get<User>('/me', true);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/refresh-token', { refreshToken });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/request-password-reset', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/reset-password', { token, newPassword });
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/logout', { refreshToken }, true);
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/change-password', { 
      currentPassword, 
      newPassword 
    }, true);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/verify-email', { token });
  }

  /**
   * Resend email verification
   */
  async resendVerification(): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/resend-verification', {}, true);
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailability(email: string): Promise<ApiResponse<{ available: boolean }>> {
    return this.post<{ available: boolean }>('/check-email', { email });
  }
} 