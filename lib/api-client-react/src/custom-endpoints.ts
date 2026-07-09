/**
 * Custom React Query hooks that extend the generated API client.
 * These cover endpoints not included in the generated OpenAPI spec.
 */
import { useMutation, useQuery } from '@tanstack/react-query';

const BASE = '/api';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(), ...init });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── ScheduleStudent type ───────────────────────────────────────────────────────

export interface ScheduleStudent {
  id: string;
  firstName: string;
  lastName: string;
  section?: string | null;
  yearLevel?: number | null;
  studentNumber?: string | null;
  avatarUrl?: string | null;
}

// ── Student Profile Update ─────────────────────────────────────────────────────

export interface StudentProfileUpdateInput {
  phone?: string;
  emergencyContact?: string;
  landmark?: string;
  city?: string;
  transportationMethod?: string;
}

export function useUpdateStudentProfile() {
  return useMutation({
    mutationFn: (data: StudentProfileUpdateInput) =>
      apiFetch('/students/me/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  });
}

// ── Buddy Attendance ──────────────────────────────────────────────────────────

export interface BuddyEligibility {
  eligible: boolean;
  reason?: string;
}

export function useBuddyEligible(scheduleId: string | undefined, enabled = true) {
  return useQuery<BuddyEligibility>({
    queryKey: ['buddy-eligible', scheduleId],
    queryFn: () => apiFetch<BuddyEligibility>(`/attendance/buddy-eligible/${scheduleId}`),
    enabled: !!scheduleId && enabled,
    staleTime: 30_000,
  });
}

export interface BuddyTimeInInput {
  scheduleId: string;
  targetStudentId: string;
  descriptor: number[];
  latitude?: number;
  longitude?: number;
}

export function useBuddyTimeIn() {
  return useMutation({
    mutationFn: (data: BuddyTimeInInput) =>
      apiFetch('/attendance/buddy-time-in', { method: 'POST', body: JSON.stringify(data) }),
  });
}

// ── Why Was I Assigned? ───────────────────────────────────────────────────────

export interface WhyAssignedResult {
  score: number;
  reasons: string[];
  computed: boolean;
}

export function useWhyAssigned(scheduleId: string | undefined, enabled = true) {
  return useQuery<WhyAssignedResult>({
    queryKey: ['why-assigned', scheduleId],
    queryFn: () => apiFetch<WhyAssignedResult>(`/recommendations/why-assigned/${scheduleId}`),
    enabled: !!scheduleId && enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
