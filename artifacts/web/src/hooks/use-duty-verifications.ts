import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type DutyVerificationStatus =
  | 'waiting_ci'
  | 'ci_verified'
  | 'pending_scheduler'
  | 'officially_verified';

export interface SelectedCase {
  id: string;
  dutyVerificationId: string;
  clinicalCaseId: string;
  clinicalCase: {
    id: string;
    name: string;
    category: string;
    requiredCount: number;
  } | null;
  createdAt: string;
}

export interface DutyVerification {
  id: string;
  studentId: string;
  scheduleId: string;
  attendanceId: string;
  hospitalId: string;
  departmentId: string;
  ciId: string;
  dutyDate: string;
  status: DutyVerificationStatus;
  ciRemarks: string | null;
  ciVerifiedAt: string | null;
  ciVerifiedBy: string | null;
  schedulerConfirmedAt: string | null;
  schedulerConfirmedBy: string | null;
  createdAt: string;
  updatedAt: string;
  student: { id: string; firstName: string; lastName: string; email: string } | null;
  ci: { id: string; firstName: string; lastName: string } | null;
  schedule: {
    id: string;
    dutyDate: string;
    startTime: string;
    endTime: string;
    title: string | null;
  } | null;
  hospital: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  attendance: {
    id: string;
    timeIn: string | null;
    timeOut: string | null;
    status: string;
    dutyHours: number | null;
  } | null;
  selectedCases: SelectedCase[];
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const dutyVerificationKeys = {
  all: ['duty-verifications'] as const,
  list: (status?: string) => [...dutyVerificationKeys.all, 'list', status] as const,
  detail: (id: string) => [...dutyVerificationKeys.all, 'detail', id] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useListDutyVerifications(status?: string) {
  return useQuery({
    queryKey: dutyVerificationKeys.list(status),
    queryFn: () => {
      const params = status ? `?status=${status}` : '';
      return apiFetch<DutyVerification[]>(`/api/duty-verifications${params}`);
    },
    staleTime: 30_000,
    refetchOnMount: true,
  });
}

export function useGetDutyVerification(id: string) {
  return useQuery({
    queryKey: dutyVerificationKeys.detail(id),
    queryFn: () => apiFetch<DutyVerification>(`/api/duty-verifications/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRequestDutyVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { scheduleId: string; attendanceId: string }) =>
      apiFetch<DutyVerification>('/api/duty-verifications', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dutyVerificationKeys.all });
    },
  });
}

export function useCiVerifyDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, caseIds, remarks }: { id: string; caseIds: string[]; remarks?: string }) =>
      apiFetch<DutyVerification>(`/api/duty-verifications/${id}/ci-verify`, {
        method: 'PATCH',
        body: JSON.stringify({ caseIds, remarks }),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: dutyVerificationKeys.all });
      queryClient.invalidateQueries({ queryKey: dutyVerificationKeys.detail(id) });
    },
  });
}

export interface BulkVerifyResult {
  verified: number;
  results: Array<{ id: string; status: 'ok' | 'error'; error?: string }>;
}

export function useCiBulkVerifyDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; caseIds: string[]; remarks?: string }) =>
      apiFetch<BulkVerifyResult>('/api/duty-verifications/bulk-ci-verify', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dutyVerificationKeys.all });
    },
  });
}

export function useConfirmDutyVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<DutyVerification>(`/api/duty-verifications/${id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: dutyVerificationKeys.all });
      queryClient.invalidateQueries({ queryKey: dutyVerificationKeys.detail(id) });
      // Also invalidate the passport since it changes on confirm
      queryClient.invalidateQueries({ queryKey: ['student-passport'] });
    },
  });
}
