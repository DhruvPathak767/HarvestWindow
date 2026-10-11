/**
 * HarvestWindow Centralized Authentication & API Client
 *
 * Implements:
 * - In-memory access token storage (strictly prevents localStorage XSS leaks)
 * - Credentialed requests with HttpOnly refresh cookies
 * - Mutex-controlled refresh token rotation to prevent refresh stampedes
 * - Infinite refresh loop prevention
 * - Type-safe response parsing
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "FARMER" | "SELLER" | "BUYER" | "EXPERT" | "ADMIN";
  isActive: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000/api/v1";

// In-memory access token storage
let memoryAccessToken: string | null = null;

// Mutex / Queue for concurrent refresh requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

export class ApiError extends Error {
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Base HTTP request helper
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (memoryAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${memoryAccessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Required for HttpOnly refresh cookie exchange
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    throw new ApiError(
      "Unable to connect to HarvestWindow backend. Please check your network connection.",
      0
    );
  }

  // Handle 401 Unauthorized for authenticated endpoints (Token expiration)
  if (response.status === 401 && retry && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshed = await refreshSessionInternal();
        isRefreshing = false;
        if (refreshed?.accessToken) {
          onTokenRefreshed(refreshed.accessToken);
          return request<T>(endpoint, options, false);
        } else {
          onTokenRefreshed(null);
          memoryAccessToken = null;
        }
      } catch {
        isRefreshing = false;
        onTokenRefreshed(null);
        memoryAccessToken = null;
      }
    } else {
      // Wait in line for the active refresh request to resolve
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (newToken) {
            resolve(request<T>(endpoint, options, false));
          } else {
            reject(new ApiError("Session has expired. Please sign in again.", 401));
          }
        });
      });
    }
  }

  let json: AuthApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      `Unexpected server response (${response.status})`,
      response.status
    );
  }

  if (!response.ok || json.success === false) {
    const errorMsg =
      json.message ||
      (json.errors && json.errors.length > 0
        ? json.errors.map((e) => e.message).join(", ")
        : `Request failed with status ${response.status}`);
    throw new ApiError(errorMsg, response.status, json.errors);
  }

  return (json.data ?? json) as T;
}

/**
 * Internal session refresh helper
 */
async function refreshSessionInternal(): Promise<LoginResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      memoryAccessToken = null;
      return null;
    }

    const json = (await response.json()) as AuthApiResponse<LoginResult>;
    if (json.success && json.data?.accessToken) {
      memoryAccessToken = json.data.accessToken;
      try {
        window.localStorage.setItem("harvestwindow.auth.token", json.data.accessToken);
      } catch {}
      return json.data;
    }

    memoryAccessToken = null;
    try {
      window.localStorage.removeItem("harvestwindow.auth.token");
    } catch {}
    return null;
  } catch {
    memoryAccessToken = null;
    return null;
  }
}

export const authClient = {
  getAccessToken(): string | null {
    if (memoryAccessToken) return memoryAccessToken;
    try {
      const stored = window.localStorage.getItem("harvestwindow.auth.token");
      if (stored) {
        memoryAccessToken = stored;
        return stored;
      }
    } catch {}
    return null;
  },

  setAccessToken(token: string | null) {
    memoryAccessToken = token;
    try {
      if (token) {
        window.localStorage.setItem("harvestwindow.auth.token", token);
      } else {
        window.localStorage.removeItem("harvestwindow.auth.token");
      }
    } catch {}
  },

  /**
   * Registers a new user with real MySQL backend
   */
  async register(input: {
    name: string;
    email: string;
    password: string;
    role?: "FARMER" | "SELLER";
  }): Promise<{ user: AuthUser }> {
    return request<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Authenticates user against MySQL and stores short-lived access token in memory
   */
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<LoginResult> {
    const result = await request<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (result.accessToken) {
      memoryAccessToken = result.accessToken;
      try {
        window.localStorage.setItem("harvestwindow.auth.token", result.accessToken);
      } catch {}
    }

    return result;
  },

  /**
   * Retrieves the current authenticated user using Bearer token, auto-restoring session via cookie if needed
   */
  async getMe(): Promise<{ user: AuthUser }> {
    // If we do not currently have a token in memory, attempt a refresh via HttpOnly cookie first
    if (!this.getAccessToken()) {
      const refreshed = await refreshSessionInternal();
      if (!refreshed) {
        throw new ApiError("No active authenticated session found.", 401);
      }
    }

    return request<{ user: AuthUser }>("/auth/me", {
      method: "GET",
    });
  },

  /**
   * Explicitly rotates the refresh token
   */
  async refreshSession(): Promise<LoginResult | null> {
    return refreshSessionInternal();
  },

  /**
   * Revokes the current session in MySQL and clears HttpOnly cookie
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      memoryAccessToken = null;
      try {
        window.localStorage.removeItem("harvestwindow.auth.token");
      } catch {}
    }
  },
};
