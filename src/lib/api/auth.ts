/**
 * Authentication API Module
 *
 * Handles user authentication operations:
 * - Sign in / Sign out
 * - Token refresh
 * - Password reset
 * - CSRF token management
 */

import apiClient from './client';
import type { JwtDto, ResetPasswordRequest } from '@/lib/types';

interface SignInRequest {
  email: string;
  password: string;
}

interface CsrfTokenResponse {
  csrfToken: string;
}

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

/**
 * Sign in (로그인)
 * POST /api/auth/login
 *
 * @param credentials - User credentials (email, password)
 * @returns JWT token and user information
 *
 * Note: Uses application/x-www-form-urlencoded format
 */
export const signIn = async (credentials: SignInRequest): Promise<JwtDto> => {
  await getCsrfToken();

  const params = new URLSearchParams();
  if (credentials.email) params.append('email', credentials.email);
  if (credentials.password) params.append('password', credentials.password);

  const response = await apiClient.post<JwtDto>('/api/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  // Spring Security replaces the cookie-backed CSRF token after authentication.
  csrfToken = null;
  return response.data;
};

/**
 * Sign out (로그아웃)
 * POST /api/auth/logout
 *
 * Note: Handled by SecurityFilterChain
 */
export const signOut = async (): Promise<void> => {
  await getCsrfToken();
  await apiClient.post('/api/auth/logout');
};

/**
 * Refresh access token (토큰 재발급)
 * POST /api/auth/refresh
 *
 * @returns New JWT token and user information
 *
 * Note: Uses REFRESH_TOKEN cookie automatically (withCredentials: true)
 */
export const refreshToken = async (): Promise<JwtDto> => {
  await getCsrfToken();
  const response = await apiClient.post<JwtDto>('/api/auth/refresh');
  return response.data;
};

/**
 * Reset password (비밀번호 초기화)
 * POST /api/auth/reset-password
 *
 * @param request - Email to send temporary password
 *
 * Note: Sends temporary password to email
 */
export const resetPassword = async (request: ResetPasswordRequest): Promise<void> => {
  await apiClient.post('/api/auth/reset-password', request);
};

/**
 * Get CSRF token (CSRF 토큰 조회)
 * GET /api/auth/csrf-token
 *
 * Note: Token is stored in XSRF-TOKEN cookie automatically
 */
export const getCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken;

  if (!csrfTokenRequest) {
    csrfTokenRequest = apiClient
      .get<CsrfTokenResponse>('/api/auth/csrf-token')
      .then((response) => {
        const token = response.data.csrfToken || getCsrfTokenFromCookie();
        if (!token) {
          throw new Error('The API did not return a CSRF token.');
        }
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }

  return csrfTokenRequest;
};

export const getCachedCsrfToken = (): string | null => csrfToken;

/**
 * Get CSRF token from cookie
 *
 * @returns CSRF token string or null
 */
export const getCsrfTokenFromCookie = (): string | null => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};
