import { QueryClient, QueryFunction } from "@tanstack/react-query";


// -----------------------------
// Helper: throw error if API fails
// -----------------------------
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}


// -----------------------------
// MAIN API REQUEST FUNCTION
// (All backend calls go through here)
// -----------------------------
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {

  // 🔥 Your Render backend base URL
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const res = await fetch(BASE_URL + url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  return res;
}


// -----------------------------
// React Query helper for GET queries
// -----------------------------
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn =
  <T>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

    const res = await fetch(BASE_URL + (queryKey.join("/") as string), {
      credentials: "include",
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);

    return await res.json();
  };


// -----------------------------
// Global Query Client
// -----------------------------
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
