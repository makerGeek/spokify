import { captureAPIError } from './sentry';

// Enhanced API client with error handling and retry logic
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  retries?: number;
  timeout?: number;
}

export async function apiRequest(
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> {
  const {
    method = 'GET',
    headers = {},
    body,
    retries = 3,
    timeout = 10000
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new APIError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          endpoint,
          errorData
        );

        // Don't retry client errors (4xx), only server errors (5xx)
        if (response.status < 500 || attempt === retries) {
          captureAPIError(error, endpoint, {
            attempt: attempt + 1,
            status: response.status,
            method,
          });
          throw error;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === retries) {
        if (error instanceof APIError) {
          throw error;
        }

        const apiError = new APIError(
          error instanceof Error ? error.message : 'Network error',
          0,
          endpoint
        );
        
        captureAPIError(apiError, endpoint, {
          attempt: attempt + 1,
          originalError: error,
          method,
        });
        
        throw apiError;
      }

      // Wait before retry for network errors
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}

// Specialized methods for common operations
export const api = {
  get: (endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: data }),

  put: (endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body: data }),

  delete: (endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};