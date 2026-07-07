import { useGetMe, useLogout, getGetMeQueryKey, setAuthTokenGetter } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

// Initialise JWT getter immediately on module load so every fetch
// (including the very first /api/auth/me on page load) carries the token.
setAuthTokenGetter(() => localStorage.getItem('authToken'));

// Mock user shapes for the dev role switcher (mock mode only)
const MOCK_USERS: Record<string, object> = {
  admin: {
    id: 'u-admin-001',
    email: 'admin@clinicalflow.com',
    role: 'admin',
    firstName: 'Dr. Elena',
    lastName: 'Reyes',
    isActive: true,
    avatarUrl: null,
    studentProfile: null,
    ciProfile: null,
  },
  scheduler: {
    id: 'u-scheduler-001',
    email: 'scheduler@clinicalflow.com',
    role: 'scheduler',
    firstName: 'Maria',
    lastName: 'Santos',
    isActive: true,
    avatarUrl: null,
    studentProfile: null,
    ciProfile: null,
  },
  ci: {
    id: 'u-ci-001',
    email: 'ci@clinicalflow.com',
    role: 'ci',
    firstName: 'Ana',
    lastName: 'Dela Cruz',
    isActive: true,
    avatarUrl: null,
    studentProfile: null,
    ciProfile: {
      id: 'cip-001',
      userId: 'u-ci-001',
      employeeId: 'CI-2024-001',
      specialization: 'Obstetrics & Gynecology',
    },
  },
  student: {
    id: 'u-student-001',
    email: 'student@clinicalflow.com',
    role: 'student',
    firstName: 'Juan',
    lastName: 'Cruz',
    isActive: true,
    avatarUrl: null,
    studentProfile: {
      id: 'sp-001',
      userId: 'u-student-001',
      studentNumber: 'BSN-2024-001',
      yearLevel: 3,
      section: 'A',
      program: 'BSN',
      academicYear: '2024-2025',
      totalHoursRequired: 500,
    },
    ciProfile: null,
  },
};

export function useAuth() {
  const queryClient = useQueryClient();
  const mockRole = localStorage.getItem('mockRole');

  // Real session query — only fires when not in mock mode
  const realAuth = useGetMe({
    query: {
      enabled: !mockRole,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('mockRole');
        setAuthTokenGetter(null);
        queryClient.clear();
        window.location.href = '/login';
      },
    },
  });

  if (mockRole && MOCK_USERS[mockRole]) {
    return {
      user: MOCK_USERS[mockRole] as ReturnType<typeof useGetMe>['data'],
      isLoading: false,
      isError: false,
      isMock: true,
      logout: () => {
        localStorage.removeItem('mockRole');
        queryClient.clear();
        window.location.href = '/login';
      },
    };
  }

  return {
    user: realAuth.data,
    isLoading: realAuth.isLoading,
    isError: realAuth.isError,
    isMock: false,
    logout: () => {
      logoutMutation.mutate(undefined as unknown as void);
    },
  };
}
