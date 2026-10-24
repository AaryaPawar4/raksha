import {
  ApiResponse,
  HealthCheckData,
  Incident,
  CreateIncidentDTO,
  PaginatedResult,
  IncidentListQuery,
  ThreatLinkEdge,
  ThreatLinkFeedbackDTO,
  ThreatAnalysisResponse,
  AnalyzeIncidentDTO,
  EvidenceItem,
  EvidenceItemWithCiphertext,
  UploadEvidenceDTO,
  VerifyEvidenceResponse,
  ReportDraft,
  TrackedCase,
  CreateCaseDTO,
  UpdateCaseDTO,
  TrustedContact,
  CreateContactDTO,
  UpdateContactDTO,
  ConsentStatus,
  CheckIn,
  CreateCheckInDTO,
  User,
  AuthResponse,
  RegisterDTO,
  LoginDTO,
  ReadinessCheckData,
} from '@rakshasphere/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export class ApiError extends Error {
  public code: string;
  public details?: unknown;
  public status: number;

  constructor(message: string, code: string, status: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const defaultHeaders: HeadersInit = { 'Content-Type': 'application/json' };

  // If authenticated with real JWT, send Bearer token; else fallback to demo header in dev
  const authHeaders: Record<string, string> = {};
  const accessToken = sessionStorage.getItem('access_token');
  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`;
  } else {
    const demoUserId = sessionStorage.getItem('demo_user_id') || 'demo-user-default';
    authHeaders['x-demo-user-id'] = demoUserId;
  }

  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: { ...defaultHeaders, ...authHeaders, ...options?.headers },
    });

    const body: ApiResponse<T> = await response.json();

    if (!body.success) {
      // If unauthorized, clear invalid token
      if (response.status === 401 && accessToken) {
        sessionStorage.removeItem('access_token');
      }

      throw new ApiError(
        body.error.message || 'An unexpected error occurred',
        body.error.code || 'INTERNAL_ERROR',
        response.status,
        body.error.details
      );
    }
    return body.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_ERROR',
      0
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  getHealth: () => request<HealthCheckData>('/health'),
  getReadiness: () => request<ReadinessCheckData>('/health/ready'),

  auth: {
    register: async (data: RegisterDTO) => {
      const res = await request<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.accessToken) {
        sessionStorage.setItem('access_token', res.accessToken);
      }
      return res;
    },
    login: async (data: LoginDTO) => {
      const res = await request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.accessToken) {
        sessionStorage.setItem('access_token', res.accessToken);
      }
      return res;
    },
    refresh: async (refreshToken?: string) => {
      const res = await request<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      if (res.accessToken) {
        sessionStorage.setItem('access_token', res.accessToken);
      }
      return res;
    },
    logout: async () => {
      try {
        await request<{ message: string }>('/api/v1/auth/logout', {
          method: 'POST',
        });
      } finally {
        sessionStorage.removeItem('access_token');
      }
    },
    me: () => request<User>('/api/v1/auth/me'),
  },

  incidents: {
    create: (data: CreateIncidentDTO) =>
      request<Incident>('/api/v1/incidents', { method: 'POST', body: JSON.stringify(data) }),
    list: (query?: IncidentListQuery) => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));
      if (query?.status) params.set('status', query.status);
      if (query?.incidentType) params.set('incidentType', query.incidentType);
      const qs = params.toString();
      return request<PaginatedResult<Incident>>(`/api/v1/incidents${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request<Incident>(`/api/v1/incidents/${id}`),
    getReportDraft: (id: string) =>
      request<ReportDraft>(`/api/v1/incidents/${id}/report-draft`),
    analyze: (id: string, options: AnalyzeIncidentDTO) =>
      request<ThreatAnalysisResponse>(`/api/v1/incidents/${id}/analyze`, {
        method: 'POST',
        body: JSON.stringify(options),
      }),
  },

  threatLinks: {
    getForIncident: (incidentId: string) =>
      request<ThreatLinkEdge[]>(`/api/v1/incidents/${incidentId}/links`),
    submitFeedback: (linkId: string, disposition: ThreatLinkFeedbackDTO['disposition']) =>
      request<ThreatLinkEdge>(`/api/v1/threat-links/${linkId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ disposition }),
      }),
  },

  vault: {
    upload: (data: UploadEvidenceDTO) =>
      request<EvidenceItem>('/api/v1/vault/items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listByIncident: (incidentId: string) =>
      request<EvidenceItem[]>(`/api/v1/vault/items?incidentId=${encodeURIComponent(incidentId)}`),
    getById: (id: string) =>
      request<EvidenceItemWithCiphertext>(`/api/v1/vault/items/${id}`),
    verify: (id: string) =>
      request<VerifyEvidenceResponse>(`/api/v1/vault/items/${id}/verify`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/api/v1/vault/items/${id}`, {
        method: 'DELETE',
      }),
  },

  cases: {
    create: (data: CreateCaseDTO) =>
      request<TrackedCase>('/api/v1/cases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (incidentId?: string) => {
      const qs = incidentId ? `?incidentId=${encodeURIComponent(incidentId)}` : '';
      return request<TrackedCase[]>(`/api/v1/cases${qs}`);
    },
    getById: (id: string) =>
      request<TrackedCase>(`/api/v1/cases/${id}`),
    update: (id: string, data: UpdateCaseDTO) =>
      request<TrackedCase>(`/api/v1/cases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/api/v1/cases/${id}`, {
        method: 'DELETE',
      }),
  },

  contacts: {
    create: (data: CreateContactDTO) =>
      request<TrustedContact>('/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => request<TrustedContact[]>('/api/v1/contacts'),
    getById: (id: string) => request<TrustedContact>(`/api/v1/contacts/${id}`),
    update: (id: string, data: UpdateContactDTO) =>
      request<TrustedContact>(`/api/v1/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateConsent: (id: string, data: { consentStatus: ConsentStatus }) =>
      request<TrustedContact>(`/api/v1/contacts/${id}/consent`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/api/v1/contacts/${id}`, {
        method: 'DELETE',
      }),
  },

  checkIns: {
    create: (data: CreateCheckInDTO) =>
      request<CheckIn>('/api/v1/check-ins', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => request<CheckIn[]>('/api/v1/check-ins'),
    getById: (id: string) => request<CheckIn>(`/api/v1/check-ins/${id}`),
    complete: (id: string) =>
      request<CheckIn>(`/api/v1/check-ins/${id}/complete`, {
        method: 'POST',
      }),
    cancel: (id: string) =>
      request<CheckIn>(`/api/v1/check-ins/${id}/cancel`, {
        method: 'POST',
      }),
    acknowledgeDelivery: (id: string) =>
      request<CheckIn>(`/api/v1/check-ins/${id}/acknowledge-delivery`, {
        method: 'POST',
      }),
  },
};
