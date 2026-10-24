export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken?: string;
}
