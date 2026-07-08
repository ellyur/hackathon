import { useGetMe, useLogout, getGetMeQueryKey, setAuthTokenGetter } from '@workspace/api-client-react';
import type { AuthUser } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

// Initialise JWT getter immediately on module load so every fetch
// (including the very first /api/auth/me on page load) carries the token.
setAuthTokenGetter(() => localStorage.getItem('authToken'));

/** Read the user that was saved to localStorage at login time. Synchronous. */
function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();

  const hasToken = !!localStorage.getItem('authToken');
  const cachedUser = readCachedUser();

  // Background re-validation query — only fires when a token exists.
  // We don't block rendering on it; if cachedUser is available the app
  // renders immediately and this silently refreshes in the background.
  const realAuth = useGetMe({
    query: {
      enabled: hasToken,
      retry: false,
      staleTime: 5 * 60 * 1000,   // treat the response as fresh for 5 min
      queryKey: getGetMeQueryKey(),
    },
  });

  // Keep localStorage in sync when the server returns fresh data
  if (realAuth.data) {
    const stored = localStorage.getItem('authUser');
    const fresh = JSON.stringify(realAuth.data);
    if (stored !== fresh) {
      localStorage.setItem('authUser', fresh);
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setAuthTokenGetter(null);
    queryClient.clear();
    window.location.href = '/login';
  };

  // User comes from: live API response → cached localStorage → nothing
  const user = realAuth.data ?? cachedUser ?? undefined;

  // isLoading is only true when we have no cached user AND the query is running.
  // If we have a cached user, render immediately (background refresh is silent).
  const isLoading = !cachedUser && realAuth.isLoading;

  return {
    user,
    isLoading,
    isError: realAuth.isError,
    isMock: false,
    logout,
  };
}
