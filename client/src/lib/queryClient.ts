import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';

// Get API base URL - use full URL for native apps, relative for web
function getApiBaseUrl(): string {
  // Check if running in native app
  if (Capacitor.isNativePlatform()) {
    // Use production URL for native apps
    const apiUrl = import.meta.env.VITE_API_URL || 'https://gospel-era.replit.app';
    console.log('🌐 Native app detected - using API URL:', apiUrl);
    return apiUrl;
  }
  // For web, use relative URLs (same origin)
  console.log('🌐 Web app detected - using relative URLs');
  return '';
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get Supabase session for JWT authentication
  const { supabase } = await import('./supabaseClient')
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {}
  
  if (data) {
    headers["Content-Type"] = "application/json"
  }
  
  // Add JWT token for secure authentication
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`
  }

  const apiBaseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
  console.log('🔗 Fetching:', fullUrl);
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get Supabase session for JWT authentication
    const { supabase } = await import('./supabaseClient')
    const { data: { session } } = await supabase.auth.getSession()
    
    const headers: Record<string, string> = {}
    
    // Add JWT token for secure authentication
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`
    }

    const apiBaseUrl = getApiBaseUrl();
    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
