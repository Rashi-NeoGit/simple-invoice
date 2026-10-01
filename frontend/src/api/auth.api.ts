import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  fullname: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', { email, password }).then((res) => res.data);
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/auth/me').then((res) => res.data);
}
