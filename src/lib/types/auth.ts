export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: Date | null;
}