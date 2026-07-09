import { useMemo } from 'react';
import type { AuthUser } from '@workspace/api-client-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type CertTier = 'bronze' | 'silver' | 'gold' | 'excellence';
export type CertType = 'clinical_hours' | 'ward_completion' | 'academic_year';

export interface Certificate {
  id: string;
  type: CertType;
  title: string;
  subtitle: string;
  tier?: CertTier;
  earnedAt: string;
  studentName: string;
  studentNumber: string;
  program: string;
  schoolYear: string;
  yearLevel: number | null;
  hoursCompleted?: number;
  requiredHours?: number;
  percentageCompleted?: number;
  wardName?: string;
  achievementDetail: string;
}

interface WardCase { status: 'complete' | 'in_progress' | 'deficient'; required: number; verified: number; }
interface WardProgress {
  departmentId: string;
  wardName?: string;
  name?: string;
  status?: 'complete' | 'in_progress' | 'not_started';
  requiredCases?: WardCase[];
  completionPct?: number;
}
export interface PassportData {
  studentId?: string;
  earnedDutyHours: number;
  requiredDutyHours: number;
  dutyHoursCompletion: number;
  totalDutyDaysRequired: number;
  totalDutyDaysCompleted: number;
  overallCompletion: number;
  wards: WardProgress[];
}

// ── Deterministic cert ID (no crypto needed) ──────────────────────────────────

function certId(studentId: string, key: string): string {
  const str = `SIPAG|${studentId}|${key}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return `CERT-${h.toString(36).toUpperCase().padStart(7, '0')}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const MILESTONES: { pct: number; tier: CertTier; title: string }[] = [
  { pct: 25,  tier: 'bronze',     title: 'Bronze Clinical Achievement' },
  { pct: 50,  tier: 'silver',     title: 'Silver Clinical Achievement' },
  { pct: 75,  tier: 'gold',       title: 'Gold Clinical Achievement' },
  { pct: 100, tier: 'excellence', title: 'Clinical Excellence Certificate' },
];

// Stable date string (date only, no time) — changes only when the calendar date changes,
// not on every re-render. We derive it once outside the hook so the memo doesn't
// re-trigger merely because time passed.
function todayDateString(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function useCertificates(
  passport: PassportData | undefined,
  user: AuthUser | undefined,
): Certificate[] {
  // Stable ISO string — only date portion so it's identical for all renders on the same day
  const stableToday = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  }, []); // empty deps = computed once at hook mount

  return useMemo(() => {
    if (!passport || !user) return [];

    const studentId   = user.id;
    const studentName = `${user.firstName} ${user.lastName}`;
    const sp          = (user as any).studentProfile ?? {};
    const studentNumber = sp.studentNumber ?? '—';
    const program       = sp.program ?? 'Bachelor of Science in Nursing';
    const schoolYear    = sp.academicYear ?? `${new Date().getFullYear() - 1}–${new Date().getFullYear()}`;
    const yearLevel     = sp.yearLevel ?? null;

    const certs: Certificate[] = [];
    const earned   = passport.earnedDutyHours;
    const required = passport.requiredDutyHours || 1;

    // ── 1. Clinical Hours Milestones ──────────────────────────────────────────
    for (const m of MILESTONES) {
      const threshold = required * (m.pct / 100);
      if (earned >= threshold) {
        certs.push({
          id: certId(studentId, `hours-${m.pct}`),
          type: 'clinical_hours',
          title: m.title,
          subtitle: `${m.pct}% Clinical Hours Completion`,
          tier: m.tier,
          earnedAt: stableToday,
          studentName, studentNumber, program, schoolYear, yearLevel,
          hoursCompleted: earned,
          requiredHours: required,
          percentageCompleted: m.pct,
          achievementDetail: `has successfully completed ${earned.toFixed(1)} clinical duty hours, achieving ${m.pct}% of the required ${required} hours`,
        });
      }
    }

    // ── 2. Ward Completion Certificates ──────────────────────────────────────
    for (const ward of passport.wards) {
      const wardName = ward.wardName ?? ward.name ?? 'Clinical Ward';
      const isComplete =
        ward.status === 'complete' ||
        (ward.completionPct != null && ward.completionPct >= 100) || // completionPct is on a 0–100 scale
        (ward.requiredCases != null &&
          ward.requiredCases.length > 0 &&
          ward.requiredCases.every(c => c.status === 'complete'));

      if (isComplete) {
        certs.push({
          id: certId(studentId, `ward-${ward.departmentId}`),
          type: 'ward_completion',
          title: `${wardName} Completion Certificate`,
          subtitle: 'Ward Rotation Completion',
          earnedAt: stableToday,
          studentName, studentNumber, program, schoolYear, yearLevel,
          wardName,
          achievementDetail: `has successfully completed all required clinical rotations and verified case requirements for the ${wardName} ward rotation`,
        });
      }
    }

    // ── 3. Academic Year Achievement ──────────────────────────────────────────
    if (passport.overallCompletion >= 1) {
      const yearLabel = yearLevel ? `Year ${yearLevel}` : 'Academic Year';
      certs.push({
        id: certId(studentId, `year-${schoolYear}`),
        type: 'academic_year',
        title: `${yearLabel} Clinical Rotations Completed`,
        subtitle: `Academic Year ${schoolYear}`,
        earnedAt: stableToday,
        studentName, studentNumber, program, schoolYear, yearLevel,
        achievementDetail: `has successfully completed all clinical rotation requirements for ${yearLabel}, Academic Year ${schoolYear}, demonstrating excellence in clinical nursing practice`,
      });
    }

    return certs;
  }, [passport, user]);
}

// ── Next milestone helper ─────────────────────────────────────────────────────

export function nextMilestone(
  passport: PassportData | undefined,
): { title: string; pct: number; tier: CertTier } | null {
  if (!passport) return null;
  const earned   = passport.earnedDutyHours;
  const required = passport.requiredDutyHours || 1;
  const pct      = (earned / required) * 100;
  return MILESTONES.find(m => pct < m.pct) ?? null;
}
