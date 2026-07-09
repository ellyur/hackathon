/**
 * SIPAG Production Seed — School Year 2026-2027, 1st Semester
 * BSN Program · 3 Year Levels · 15 Sections · 375 Students
 *
 * Run:  pnpm --filter @workspace/scripts run seed
 * Idempotent: truncates all tables then reinserts from scratch.
 */
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  ciProfilesTable,
  hospitalsTable,
  departmentsTable,
  clinicalCasesTable,
  caseCompletionsTable,
  schedulesTable,
  scheduleStudentsTable,
  attendanceTable,
  dutyVerificationsTable,
  dutyVerificationCasesTable,
  notificationsTable,
  announcementsTable,
  announcementReadsTable,
  academicYearSettingsTable,
  academicListItemsTable,
  studentAcademicSchedulesTable,
  systemSettingsTable,
  evaluationsTable,
} from "@workspace/db";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

// ─── helpers ──────────────────────────────────────────────────────────────────
const HASH = await bcrypt.hash("password123", 10);
const SCHOOL_YEAR = "2026-2027";
const SEMESTER = "1st Semester";
const PROGRAM = "Bachelor of Science in Nursing";

function pad(n: number, w = 4) { return String(n).padStart(w, "0"); }
function rng(seed: number, lo: number, hi: number) {
  const x = Math.sin(seed + 9301) * 49297;
  return lo + Math.floor((x - Math.floor(x)) * (hi - lo + 1));
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Advance past Sundays */
function noSunday(d: Date): Date {
  while (d.getDay() === 0) d = addDays(d, 1);
  return d;
}
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── names ────────────────────────────────────────────────────────────────────
const FEMALE_FIRST = [
  "Maria","Ana","Rosa","Elena","Carmen","Marilou","Maricel","Lourdes",
  "Teresita","Cristina","Rowena","Sheila","Bernadette","Patricia","Jocelyn",
  "Marilyn","Joanna","Pauline","Grace","Corazon","Filipina","Natividad",
  "Perpetua","Remedios","Caridad","Dolores","Concepcion","Leticia","Evelyn","Angelica",
];
const MALE_FIRST = [
  "Jose","Juan","Pedro","Antonio","Ramon","Eduardo","Ricardo","Manuel",
  "Roberto","Alberto","Fernando","Ernesto","Carlos","Andres","Rolando",
  "Renato","Alfredo","Danilo","Dennis","Angelo","Rodel","Gideon","Noel",
  "Jayson","Mark","Ryan","Christian","Joshua","Nathan","Daniel",
];
const LAST_NAMES = [
  "Santos","Reyes","Cruz","Bautista","Ocampo","Garcia","Mendoza","Torres",
  "Flores","Ramos","Rivera","Gonzales","Lopez","Villanueva","Navarro",
  "Castillo","Morales","Santiago","Bernardo","Lim","Manuel","Vargas",
  "Aquino","Dela Cruz","De Leon","Diaz","Magno","Pascual","Abad","Aguilar",
  "Almeda","Alvarado","Arenas","Arevalo","Balbuena","Barredo","Belen",
  "Brillantes","Bulaong","Cabrera","Calma","Cancino","Candelaria","Capili",
  "Castaneda","Caunan","Cayanan","Cayabyab","Chua","Tan",
];
const LANDMARKS = [
  "SM North EDSA","SM Fairview","Trinoma","Monumento","SM Valenzuela",
  "Robinsons Novaliches","Quezon Memorial Circle","SM Quiapo","Divisoria",
  "SM Manila","Robinsons Place Manila","Intramuros","SM Megamall",
  "SM Aura Premier","Market Market BGC","Gateway Mall Cubao",
  "Araneta Center Cubao","UP Diliman Main Gate","Ateneo de Manila Gate",
  "Far Eastern University Manila","Robinsons Ermita","Luneta Park",
  "Taft Avenue LRT Station","Santolan LRT Station","Marikina Palengke",
  "Robinsons Cainta","SM City Marikina","Filinvest City Alabang",
  "Festival Mall Alabang","SM BF Parañaque",
];
const CITIES = [
  "Quezon City","Caloocan","Manila","Valenzuela","Malabon","Navotas",
  "Pasig","Marikina","Pasay","Parañaque","Las Piñas","Muntinlupa",
  "Makati","Mandaluyong","San Juan","Taguig",
];
const TRANSPORT = ["public_transport","private_car","motorcycle","walking"];
const NETWORKS = ["917","918","919","956","906","905","920","921","926","909"];

function studentName(i: number) {
  const isFemale = i % 2 === 0;
  const fn = isFemale
    ? FEMALE_FIRST[Math.floor(i / 2) % FEMALE_FIRST.length]
    : MALE_FIRST[Math.floor(i / 2) % MALE_FIRST.length];
  const ln = LAST_NAMES[i % LAST_NAMES.length];
  return { firstName: fn, lastName: ln };
}

// ─── academic sections ────────────────────────────────────────────────────────
const SECTIONS = [
  { yearLevel: 2, section: "A" }, { yearLevel: 2, section: "B" },
  { yearLevel: 2, section: "C" }, { yearLevel: 2, section: "D" },
  { yearLevel: 2, section: "E" },
  { yearLevel: 3, section: "A" }, { yearLevel: 3, section: "B" },
  { yearLevel: 3, section: "C" }, { yearLevel: 3, section: "D" },
  { yearLevel: 3, section: "E" },
  { yearLevel: 4, section: "A" }, { yearLevel: 4, section: "B" },
  { yearLevel: 4, section: "C" }, { yearLevel: 4, section: "D" },
  { yearLevel: 4, section: "E" },
];
const STUDENTS_PER_SECTION = 25;

// ─── hospitals ────────────────────────────────────────────────────────────────
const HOSPITALS = [
  { id: "h-001", name: "Our Lady of Fatima University Medical Center", address: "Valenzuela, Metro Manila", contact: "(02) 8291-5400", lat: 14.7161, lon: 120.9830, radius: 150 },
  { id: "h-002", name: "Valenzuela Medical Center", address: "MacArthur Hwy, Valenzuela, Metro Manila", contact: "(02) 8292-7791", lat: 14.7001, lon: 120.9831, radius: 120 },
  { id: "h-003", name: "East Avenue Medical Center", address: "East Avenue, Diliman, Quezon City", contact: "(02) 8928-0611", lat: 14.6462, lon: 121.0468, radius: 130 },
  { id: "h-004", name: "Philippine General Hospital", address: "Taft Avenue, Manila", contact: "(02) 8554-8400", lat: 14.5701, lon: 120.9842, radius: 200 },
  { id: "h-005", name: "Dr. Jose N. Rodriguez Memorial Hospital", address: "Tala, Caloocan, Metro Manila", contact: "(02) 8288-7801", lat: 14.7576, lon: 120.9827, radius: 120 },
  { id: "h-006", name: "National Kidney and Transplant Institute", address: "East Avenue, Diliman, Quezon City", contact: "(02) 8981-0300", lat: 14.6517, lon: 121.0519, radius: 100 },
  { id: "h-007", name: "Veterans Memorial Medical Center", address: "North Avenue, Diliman, Quezon City", contact: "(02) 8927-0000", lat: 14.6567, lon: 121.0338, radius: 130 },
  { id: "h-008", name: "St. Luke's Medical Center Quezon City", address: "E. Rodriguez Sr. Blvd., Quezon City", contact: "(02) 8789-7700", lat: 14.6207, lon: 121.0218, radius: 150 },
  { id: "h-009", name: "The Medical City Ortigas", address: "Ortigas Avenue, Pasig City", contact: "(02) 8988-1000", lat: 14.5871, lon: 121.0644, radius: 130 },
  { id: "h-010", name: "Makati Medical Center", address: "Amorsolo Street, Makati City", contact: "(02) 8888-8999", lat: 14.5560, lon: 121.0176, radius: 150 },
];

// ─── wards ────────────────────────────────────────────────────────────────────
const WARDS = [
  { code: "OR",    name: "Operating Room",       reqDays: 5,  reqHours: 40 },
  { code: "DR",    name: "Delivery Room",        reqDays: 5,  reqHours: 40 },
  { code: "OBW",   name: "OB Ward",              reqDays: 4,  reqHours: 32 },
  { code: "MSW",   name: "Medical-Surgical Ward", reqDays: 6, reqHours: 48 },
  { code: "ORTHO", name: "Orthopedic Ward",      reqDays: 4,  reqHours: 32 },
  { code: "PSYCH", name: "Psychiatric Ward",     reqDays: 4,  reqHours: 32 },
  { code: "GERI",  name: "Geriatric Ward",       reqDays: 3,  reqHours: 24 },
];

// ─── clinical cases ───────────────────────────────────────────────────────────
const CLINICAL_CASES = [
  // Operating Room
  { id: "cc-001", name: "Circulating Nurse", description: "Performing circulating nurse duties during surgical operations", category: "Operating Room", required: 3, hours: 4 },
  { id: "cc-002", name: "Scrub Nurse", description: "Assisting surgeon as scrub nurse during operative procedures", category: "Operating Room", required: 3, hours: 4 },
  { id: "cc-003", name: "Instrument Count", description: "Performing pre- and post-operative instrument counting", category: "Operating Room", required: 2, hours: 1 },
  { id: "cc-004", name: "Sponge and Needle Count", description: "Conducting sponge and needle counts before and after surgery", category: "Operating Room", required: 2, hours: 1 },
  // Delivery Room
  { id: "cc-005", name: "Normal Spontaneous Delivery (NSD)", description: "Assisting in normal spontaneous delivery of neonate", category: "Delivery Room", required: 3, hours: 4 },
  { id: "cc-006", name: "EINC Protocol", description: "Implementing Essential Intrapartum and Newborn Care protocols", category: "Delivery Room", required: 3, hours: 4 },
  { id: "cc-007", name: "Newborn Assessment", description: "Performing immediate newborn assessment and Apgar scoring", category: "Delivery Room", required: 3, hours: 2 },
  { id: "cc-008", name: "Episiotomy Care", description: "Providing post-episiotomy wound care and patient education", category: "Delivery Room", required: 2, hours: 2 },
  // OB Ward
  { id: "cc-009", name: "Prenatal Assessment", description: "Conducting comprehensive prenatal assessment and fundic height measurement", category: "OB Ward", required: 3, hours: 2 },
  { id: "cc-010", name: "Postnatal Care", description: "Providing postnatal maternal care including LATCH assessment", category: "OB Ward", required: 3, hours: 2 },
  { id: "cc-011", name: "Breastfeeding Counseling", description: "Conducting breastfeeding counseling and latch technique instruction", category: "OB Ward", required: 2, hours: 1 },
  { id: "cc-012", name: "Fetal Heart Rate Monitoring", description: "Performing and interpreting electronic fetal heart rate monitoring", category: "OB Ward", required: 2, hours: 1 },
  // Medical-Surgical
  { id: "cc-013", name: "IV Cannulation", description: "Inserting peripheral IV catheter and initiating IV therapy", category: "Medical-Surgical Ward", required: 5, hours: 1 },
  { id: "cc-014", name: "Wound Dressing and Debridement", description: "Performing sterile wound dressing changes and basic debridement", category: "Medical-Surgical Ward", required: 5, hours: 1 },
  { id: "cc-015", name: "Nasogastric Tube Insertion", description: "Inserting and verifying placement of nasogastric tube", category: "Medical-Surgical Ward", required: 3, hours: 1 },
  { id: "cc-016", name: "Urinary Catheterization", description: "Performing indwelling urinary catheter insertion with sterile technique", category: "Medical-Surgical Ward", required: 3, hours: 1 },
  { id: "cc-017", name: "Medication Administration", description: "Administering oral, IM, and IV medications per physician's order", category: "Medical-Surgical Ward", required: 5, hours: 0.5 },
  // Orthopedic
  { id: "cc-018", name: "Traction Setup and Monitoring", description: "Setting up and monitoring skeletal and skin traction devices", category: "Orthopedic Ward", required: 2, hours: 2 },
  { id: "cc-019", name: "Cast Care and Assessment", description: "Providing cast care and neurovascular assessment for casted extremity", category: "Orthopedic Ward", required: 3, hours: 1 },
  { id: "cc-020", name: "Mobility Assistance and Transfer", description: "Assisting patient with mobility and safe patient transfer techniques", category: "Orthopedic Ward", required: 5, hours: 1 },
  { id: "cc-021", name: "Body Mechanics and Positioning", description: "Applying proper body mechanics and therapeutic positioning", category: "Orthopedic Ward", required: 3, hours: 1 },
  // Psychiatric
  { id: "cc-022", name: "Mental Status Examination", description: "Conducting structured mental status examination and documentation", category: "Psychiatric Ward", required: 3, hours: 2 },
  { id: "cc-023", name: "Therapeutic Communication", description: "Applying therapeutic communication techniques in one-on-one interaction", category: "Psychiatric Ward", required: 5, hours: 1 },
  { id: "cc-024", name: "Group Therapy Facilitation", description: "Co-facilitating therapeutic group therapy sessions", category: "Psychiatric Ward", required: 2, hours: 2 },
  // Geriatric
  { id: "cc-025", name: "Geriatric Comprehensive Assessment", description: "Performing comprehensive geriatric assessment using standardized tools", category: "Geriatric Ward", required: 3, hours: 2 },
  { id: "cc-026", name: "Fall Prevention Protocol", description: "Implementing fall risk assessment and prevention interventions", category: "Geriatric Ward", required: 3, hours: 1 },
  { id: "cc-027", name: "Medication Management (Elderly)", description: "Administering and monitoring medications for elderly patients with polypharmacy", category: "Geriatric Ward", required: 5, hours: 1 },
  { id: "cc-028", name: "Skin Integrity Assessment", description: "Performing skin integrity assessment and pressure ulcer prevention interventions", category: "Geriatric Ward", required: 3, hours: 1 },
];

// ─── clinical instructors ─────────────────────────────────────────────────────
const CI_DATA = [
  { id: "u-ci-001", firstName: "Maribel",    lastName: "Ferrer",     email: "m.ferrer@clinicalflow.edu.ph",     empId: "EMP-CI-2024-001", spec: "Obstetrics and Gynecology Nursing" },
  { id: "u-ci-002", firstName: "Antonio",    lastName: "Santos",     email: "a.santos@clinicalflow.edu.ph",     empId: "EMP-CI-2024-002", spec: "Medical-Surgical Nursing" },
  { id: "u-ci-003", firstName: "Rosario",    lastName: "Dela Cruz",  email: "r.delacruz@clinicalflow.edu.ph",   empId: "EMP-CI-2024-003", spec: "Psychiatric and Mental Health Nursing" },
  { id: "u-ci-004", firstName: "Eduardo",    lastName: "Garcia",     email: "e.garcia@clinicalflow.edu.ph",     empId: "EMP-CI-2024-004", spec: "Orthopedic and Rehabilitation Nursing" },
  { id: "u-ci-005", firstName: "Carmen",     lastName: "Villanueva", email: "c.villanueva@clinicalflow.edu.ph", empId: "EMP-CI-2024-005", spec: "Geriatric and Gerontological Nursing" },
  { id: "u-ci-006", firstName: "Ramon",      lastName: "Ramos",      email: "r.ramos@clinicalflow.edu.ph",      empId: "EMP-CI-2024-006", spec: "Critical Care and Emergency Nursing" },
  { id: "u-ci-007", firstName: "Elena",      lastName: "Torres",     email: "e.torres@clinicalflow.edu.ph",     empId: "EMP-CI-2024-007", spec: "Pediatric Nursing" },
  { id: "u-ci-008", firstName: "Ricardo",    lastName: "Morales",    email: "r.morales@clinicalflow.edu.ph",    empId: "EMP-CI-2024-008", spec: "Community and Public Health Nursing" },
  { id: "u-ci-009", firstName: "Teresita",   lastName: "Bautista",   email: "t.bautista@clinicalflow.edu.ph",   empId: "EMP-CI-2024-009", spec: "Neonatal and Maternal Nursing" },
  { id: "u-ci-010", firstName: "Manuel",     lastName: "Cruz",       email: "m.cruz@clinicalflow.edu.ph",       empId: "EMP-CI-2024-010", spec: "Emergency and Trauma Nursing" },
  { id: "u-ci-011", firstName: "Patricia",   lastName: "Gonzales",   email: "p.gonzales@clinicalflow.edu.ph",   empId: "EMP-CI-2024-011", spec: "Operating Room and Perioperative Nursing" },
  { id: "u-ci-012", firstName: "Fernando",   lastName: "Ocampo",     email: "f.ocampo@clinicalflow.edu.ph",     empId: "EMP-CI-2024-012", spec: "Delivery Room and Intrapartum Nursing" },
  { id: "u-ci-013", firstName: "Maricel",    lastName: "Lopez",      email: "m.lopez@clinicalflow.edu.ph",      empId: "EMP-CI-2024-013", spec: "Oncology and Palliative Care Nursing" },
  { id: "u-ci-014", firstName: "Ernesto",    lastName: "Santiago",   email: "e.santiago@clinicalflow.edu.ph",   empId: "EMP-CI-2024-014", spec: "Renal and Nephrology Nursing" },
  { id: "u-ci-015", firstName: "Lourdes",    lastName: "Mendoza",    email: "l.mendoza@clinicalflow.edu.ph",    empId: "EMP-CI-2024-015", spec: "Cardiovascular and Cardiac Care Nursing" },
];

// ─── schedulers ───────────────────────────────────────────────────────────────
const SCHEDULER_DATA = [
  { id: "u-sch-001", firstName: "Josephine", lastName: "Reyes",    email: "scheduler@clinicalflow.edu.ph",  empId: "EMP-SCH-2024-001" },
  { id: "u-sch-002", firstName: "Andres",    lastName: "Castillo", email: "scheduler2@clinicalflow.edu.ph", empId: "EMP-SCH-2024-002" },
  { id: "u-sch-003", firstName: "Norma",     lastName: "Aquino",   email: "scheduler3@clinicalflow.edu.ph", empId: "EMP-SCH-2024-003" },
];

const ADMIN_DATA = {
  id: "u-admin-001",
  firstName: "Ma. Luisa",
  lastName: "Bautista",
  email: "admin@clinicalflow.edu.ph",
};

// ─── academic schedule templates (class schedules per year level) ──────────────
const ACADEMIC_TEMPLATES: Record<number, { subject: string; day: string; start: string; end: string }[]> = {
  2: [
    { subject: "Anatomy and Physiology",       day: "monday",    start: "07:30", end: "09:30" },
    { subject: "Biochemistry",                 day: "monday",    start: "10:00", end: "12:00" },
    { subject: "Fundamentals of Nursing",      day: "tuesday",   start: "07:30", end: "09:30" },
    { subject: "Health Assessment",            day: "tuesday",   start: "10:00", end: "12:00" },
    { subject: "Pharmacology",                 day: "wednesday", start: "07:30", end: "09:30" },
    { subject: "Microbiology and Parasitology",day: "wednesday", start: "10:00", end: "12:00" },
    { subject: "Nutrition and Diet Therapy",   day: "thursday",  start: "07:30", end: "09:30" },
    { subject: "Fundamentals of Nursing Lab",  day: "friday",    start: "07:00", end: "11:00" },
    { subject: "Physical Education",           day: "saturday",  start: "08:00", end: "10:00" },
  ],
  3: [
    { subject: "Medical-Surgical Nursing I",   day: "monday",    start: "07:30", end: "09:30" },
    { subject: "OB Nursing",                   day: "monday",    start: "10:00", end: "12:00" },
    { subject: "Psychiatric Nursing",          day: "tuesday",   start: "07:30", end: "09:30" },
    { subject: "Pediatric Nursing",            day: "tuesday",   start: "10:00", end: "12:00" },
    { subject: "Community Health Nursing",     day: "wednesday", start: "07:30", end: "09:30" },
    { subject: "Medical-Surgical Nursing II",  day: "wednesday", start: "10:00", end: "12:00" },
    { subject: "Research Methods in Nursing",  day: "thursday",  start: "07:30", end: "09:30" },
    { subject: "NCM 301 Clinical Conference",  day: "friday",    start: "07:00", end: "11:00" },
    { subject: "Health Education",             day: "saturday",  start: "08:00", end: "10:00" },
  ],
  4: [
    { subject: "Medical-Surgical Nursing III", day: "monday",    start: "07:30", end: "09:30" },
    { subject: "Public Health Nursing",        day: "monday",    start: "10:00", end: "12:00" },
    { subject: "Nursing Research",             day: "tuesday",   start: "07:30", end: "09:30" },
    { subject: "Management and Leadership in Nursing", day: "tuesday", start: "10:00", end: "12:00" },
    { subject: "Gerontological Nursing",       day: "wednesday", start: "07:30", end: "09:30" },
    { subject: "Community Health Nursing II",  day: "wednesday", start: "10:00", end: "12:00" },
    { subject: "NCM 404 Nursing Practice",     day: "thursday",  start: "07:30", end: "09:30" },
    { subject: "Research Practicum",           day: "friday",    start: "07:00", end: "11:00" },
    { subject: "Board Exam Review",            day: "saturday",  start: "08:00", end: "12:00" },
  ],
};

// ─── duty time shifts ──────────────────────────────────────────────────────────
const SHIFTS = [
  { start: "07:00", end: "15:00", hours: 8 },
  { start: "15:00", end: "23:00", hours: 8 },
  { start: "23:00", end: "07:00", hours: 8 },
  { start: "07:00", end: "19:00", hours: 12 },
];

// ─── ward-to-case-category map ────────────────────────────────────────────────
const WARD_CASES: Record<string, string[]> = {
  "OR":    ["cc-001","cc-002","cc-003","cc-004"],
  "DR":    ["cc-005","cc-006","cc-007","cc-008"],
  "OBW":   ["cc-009","cc-010","cc-011","cc-012"],
  "MSW":   ["cc-013","cc-014","cc-015","cc-016","cc-017"],
  "ORTHO": ["cc-018","cc-019","cc-020","cc-021"],
  "PSYCH": ["cc-022","cc-023","cc-024"],
  "GERI":  ["cc-025","cc-026","cc-027","cc-028"],
};

// ─── date constants ───────────────────────────────────────────────────────────
const TODAY = new Date("2026-07-09");
const PAST_START = new Date("2026-04-07");  // ~3 months ago (Mon)

// Pre-compute ~120 duty dates: 60 past, 30 current month, 30 future
function generateDutyDates(): { date: string; isPast: boolean; isCurrent: boolean; isFuture: boolean }[] {
  const dates = [];
  // Past: 60 dates from April 7 to July 8 (Mon-Sat, every 3rd day)
  let d = new Date(PAST_START);
  while (d < TODAY && dates.length < 72) {
    d = noSunday(d);
    dates.push({ date: fmtDate(d), isPast: true, isCurrent: false, isFuture: false });
    d = addDays(d, 3);
  }
  // Current: 8 more dates in July 2026 around today
  const julyDates = ["2026-07-02","2026-07-03","2026-07-05","2026-07-07","2026-07-09","2026-07-10","2026-07-12","2026-07-14"];
  for (const ds of julyDates) {
    const dd = new Date(ds);
    if (dd <= TODAY) {
      dates.push({ date: ds, isPast: ds < fmtDate(TODAY), isCurrent: ds === fmtDate(TODAY), isFuture: false });
    } else {
      dates.push({ date: ds, isPast: false, isCurrent: false, isFuture: true });
    }
  }
  // Future: August & September 2026
  let f = new Date("2026-08-01");
  while (f <= new Date("2026-09-27") && dates.length < 120) {
    f = noSunday(f);
    dates.push({ date: fmtDate(f), isPast: false, isCurrent: false, isFuture: true });
    f = addDays(f, 3);
  }
  return dates.slice(0, 120);
}

// ────────────────────────────────────────────────────────────────────────────
//  MAIN SEED
// ────────────────────────────────────────────────────────────────────────────
console.log("🌱  SIPAG Production Seed starting…");
console.log("    School Year:", SCHOOL_YEAR, "·", SEMESTER);
console.log("    Sections: 15  ·  Students: 375  ·  CIs: 15  ·  Schedulers: 3");

// ── 0. Truncate all tables (FK-cascade) ──────────────────────────────────────
console.log("\n⏳  Truncating existing data…");
await db.execute(sql`TRUNCATE TABLE
  system_settings,
  academic_year_settings,
  academic_list_items,
  announcements,
  clinical_cases,
  hospitals,
  users
CASCADE`);
console.log("    ✓ All tables cleared");

// ── 1. System settings ────────────────────────────────────────────────────────
await db.insert(systemSettingsTable).values({
  id: "singleton",
  institutionName: "Our Lady of Fatima University — College of Nursing",
  academicYear: SCHOOL_YEAR,
  contactEmail: "nursing@clinicalflow.edu.ph",
  gpsRadius: 150,
  gracePeriodMinutes: 15,
  faceVerificationRequired: true,
  gpsVerificationRequired: true,
  sessionTimeout: "8h",
  maxLoginAttempts: 5,
}).onConflictDoNothing();
console.log("  ✓ system_settings");

// ── 2. Academic year settings ─────────────────────────────────────────────────
await db.insert(academicYearSettingsTable).values({
  id: "ays-2026-2027-s1",
  schoolYear: SCHOOL_YEAR,
  semester: SEMESTER,
  requiredTotalDutyHours: 500,
}).onConflictDoNothing();
console.log("  ✓ academic_year_settings");

// ── 3. Academic list items ────────────────────────────────────────────────────
await db.insert(academicListItemsTable).values([
  { id: "ali-sy-2026", type: "school_year", label: "2026-2027", sortOrder: 1, isActive: true },
  { id: "ali-sy-2025", type: "school_year", label: "2025-2026", sortOrder: 2, isActive: false },
  { id: "ali-sem-1",   type: "semester",    label: "1st Semester", sortOrder: 1, isActive: true },
  { id: "ali-sem-2",   type: "semester",    label: "2nd Semester", sortOrder: 2, isActive: false },
  { id: "ali-sem-s",   type: "semester",    label: "Summer", sortOrder: 3, isActive: false },
  { id: "ali-yr-2",    type: "year_level",  label: "2nd Year", sortOrder: 2, isActive: true },
  { id: "ali-yr-3",    type: "year_level",  label: "3rd Year", sortOrder: 3, isActive: true },
  { id: "ali-yr-4",    type: "year_level",  label: "4th Year", sortOrder: 4, isActive: true },
  // Sections 2A-2E
  ...["A","B","C","D","E"].map((s, i) => ({ id: `ali-sec-2${s}`, type: "section" as const, label: `2${s}`, sortOrder: i + 1, isActive: true })),
  // Sections 3A-3E
  ...["A","B","C","D","E"].map((s, i) => ({ id: `ali-sec-3${s}`, type: "section" as const, label: `3${s}`, sortOrder: i + 6, isActive: true })),
  // Sections 4A-4E
  ...["A","B","C","D","E"].map((s, i) => ({ id: `ali-sec-4${s}`, type: "section" as const, label: `4${s}`, sortOrder: i + 11, isActive: true })),
]).onConflictDoNothing();
console.log("  ✓ academic_list_items");

// ── 4. Hospitals ──────────────────────────────────────────────────────────────
await db.insert(hospitalsTable).values(
  HOSPITALS.map(h => ({
    id: h.id,
    name: h.name,
    address: h.address,
    contactNumber: h.contact,
    latitude: h.lat,
    longitude: h.lon,
    attendanceRadius: h.radius,
    isActive: true,
  }))
).onConflictDoNothing();
console.log("  ✓ hospitals (10)");

// ── 5. Departments (wards per hospital) ───────────────────────────────────────
const deptRows = HOSPITALS.flatMap(h =>
  WARDS.map(w => ({
    id: `dept-${h.id}-${w.code.toLowerCase()}`,
    hospitalId: h.id,
    name: w.name,
    code: w.code,
    isActive: true,
    requiredDutyDays: w.reqDays,
    requiredDutyHours: w.reqHours,
  }))
);
for (const chunk of chunkArray(deptRows, 50)) {
  await db.insert(departmentsTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ departments (${deptRows.length} — 10 hospitals × 7 wards)`);

// ── 6. Clinical cases ─────────────────────────────────────────────────────────
await db.insert(clinicalCasesTable).values(
  CLINICAL_CASES.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    requiredCount: c.required,
    hourValue: c.hours,
    isActive: true,
  }))
).onConflictDoNothing();
console.log(`  ✓ clinical_cases (${CLINICAL_CASES.length})`);

// ── 7. Users ──────────────────────────────────────────────────────────────────
// 7a. Admin
await db.insert(usersTable).values({
  id: ADMIN_DATA.id,
  email: ADMIN_DATA.email,
  passwordHash: HASH,
  role: "admin",
  firstName: ADMIN_DATA.firstName,
  lastName: ADMIN_DATA.lastName,
  phone: "+639171110001",
  avatarUrl: `https://api.dicebear.com/7.x/thumbs/svg?seed=${ADMIN_DATA.id}`,
  isActive: true,
}).onConflictDoNothing();

// 7b. Schedulers
await db.insert(usersTable).values(
  SCHEDULER_DATA.map((s, i) => ({
    id: s.id,
    email: s.email,
    passwordHash: HASH,
    role: "scheduler" as const,
    firstName: s.firstName,
    lastName: s.lastName,
    phone: `+6391722${pad(i + 1, 4)}`,
    avatarUrl: `https://api.dicebear.com/7.x/thumbs/svg?seed=${s.id}`,
    isActive: true,
  }))
).onConflictDoNothing();

// 7c. Clinical Instructors
await db.insert(usersTable).values(
  CI_DATA.map((ci, i) => ({
    id: ci.id,
    email: ci.email,
    passwordHash: HASH,
    role: "ci" as const,
    firstName: ci.firstName,
    lastName: ci.lastName,
    phone: `+6391733${pad(i + 1, 4)}`,
    avatarUrl: `https://api.dicebear.com/7.x/thumbs/svg?seed=${ci.id}`,
    isActive: true,
  }))
).onConflictDoNothing();

// 7d. Students (375) — in chunks
const studentUserRows = Array.from({ length: 375 }, (_, i) => {
  const { firstName, lastName } = studentName(i);
  const net = NETWORKS[i % NETWORKS.length];
  const num = String(1000000 + i + 1).slice(-7);
  const emailSlug = `${firstName.toLowerCase().replace(/\s/g, "")}.${lastName.toLowerCase().replace(/[\s.]/g, "")}${pad(i + 1)}`;
  return {
    id: `u-st-${pad(i + 1)}`,
    email: `${emailSlug}@student.clinicalflow.edu.ph`,
    passwordHash: HASH,
    role: "student" as const,
    firstName,
    lastName,
    phone: `+63${net}${num}`,
    avatarUrl: `https://api.dicebear.com/7.x/thumbs/svg?seed=st${pad(i + 1)}`,
    isActive: true,
  };
});
for (const chunk of chunkArray(studentUserRows, 60)) {
  await db.insert(usersTable).values(chunk).onConflictDoNothing();
}
console.log("  ✓ users (1 admin + 3 schedulers + 15 CIs + 375 students)");

// ── 8. CI Profiles ────────────────────────────────────────────────────────────
await db.insert(ciProfilesTable).values(
  CI_DATA.map((ci, i) => ({
    id: `cip-${pad(i + 1, 3)}`,
    userId: ci.id,
    employeeId: ci.empId,
    specialization: ci.spec,
  }))
).onConflictDoNothing();
console.log("  ✓ ci_profiles (15)");

// ── 9. Student Profiles ───────────────────────────────────────────────────────
const studentProfileRows = Array.from({ length: 375 }, (_, i) => {
  const secIdx = Math.floor(i / STUDENTS_PER_SECTION); // 0-14
  const sec = SECTIONS[secIdx];
  const landmark = LANDMARKS[i % LANDMARKS.length];
  const city = CITIES[i % CITIES.length];
  const transport = TRANSPORT[i % TRANSPORT.length];
  const { firstName: efn, lastName: eln } = studentName((i + 5) % 375); // emergency contact — offset
  const relList = ["Mother","Father","Sibling","Spouse","Guardian","Aunt","Uncle"];
  const rel = relList[i % relList.length];
  const ecNet = NETWORKS[(i + 3) % NETWORKS.length];
  const ecNum = String(2000000 + i).slice(-7);
  const ec = `${efn} ${eln} (${rel}) +63${ecNet}${ecNum}`;
  return {
    id: `sp-${pad(i + 1)}`,
    userId: `u-st-${pad(i + 1)}`,
    studentNumber: `BSN-2026-${pad(i + 1)}`,
    yearLevel: sec.yearLevel,
    section: sec.section,
    program: "BSN",
    academicYear: SCHOOL_YEAR,
    totalHoursRequired: 500,
    faceDescriptor: null,
    luxandPersonUuid: null,
    landmark,
    city,
    transportationMethod: transport,
    emergencyContact: ec,
  };
});
for (const chunk of chunkArray(studentProfileRows, 60)) {
  await db.insert(studentProfilesTable).values(chunk).onConflictDoNothing();
}
console.log("  ✓ student_profiles (375)");

// ── 10. Student Academic Schedules ────────────────────────────────────────────
const academicSchRows: typeof studentAcademicSchedulesTable.$inferInsert[] = [];
for (let i = 0; i < 375; i++) {
  const secIdx = Math.floor(i / STUDENTS_PER_SECTION);
  const yearLevel = SECTIONS[secIdx].yearLevel;
  const template = ACADEMIC_TEMPLATES[yearLevel];
  for (let t = 0; t < template.length; t++) {
    const subj = template[t];
    academicSchRows.push({
      id: `asch-${pad(i + 1)}-${t}`,
      studentId: `u-st-${pad(i + 1)}`,
      subject: subj.subject,
      dayOfWeek: subj.day,
      startTime: subj.start,
      endTime: subj.end,
      semester: SEMESTER,
      schoolYear: SCHOOL_YEAR,
    });
  }
}
for (const chunk of chunkArray(academicSchRows, 100)) {
  await db.insert(studentAcademicSchedulesTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ student_academic_schedules (${academicSchRows.length})`);

// ── 11. Announcements (pinned + regular) ──────────────────────────────────────
const ANNO_SCHEDULER_ID = SCHEDULER_DATA[0].id;
await db.insert(announcementsTable).values([
  {
    id: "ann-001",
    title: "Welcome to AY 2026-2027 1st Semester Clinical Rotations",
    body: "Dear nursing students, clinical instructors, and staff — welcome to the first semester of Academic Year 2026-2027. All duty schedules for the coming months have been uploaded to the system. Please review your assigned hospitals and wards carefully and ensure your face enrollment is completed before your first duty date. For any scheduling concerns, please contact your assigned CI or the scheduling office.",
    targetRole: "all",
    postedBy: ADMIN_DATA.id,
    isPinned: true,
    expiresAt: new Date("2026-12-31T23:59:59Z"),
  },
  {
    id: "ann-002",
    title: "Mandatory Face Enrollment — Deadline July 15, 2026",
    body: "All students must complete face enrollment in the SIPAG app by July 15, 2026. Face recognition is required for biometric attendance verification. Students who fail to complete enrollment before their first clinical duty will be marked as absent. Please visit the Profile section and follow the Face Setup instructions.",
    targetRole: "student",
    postedBy: ADMIN_DATA.id,
    isPinned: true,
    expiresAt: new Date("2026-07-15T23:59:59Z"),
  },
  {
    id: "ann-003",
    title: "Schedule Upload Complete — July 2026 Duty Assignments Posted",
    body: "All clinical duty schedules for July 2026 have been finalized and uploaded. Please log in to view your assigned dates, hospitals, and wards. Students are reminded to report 15 minutes before their scheduled duty start time. Attendance grace period is 15 minutes; beyond this will be marked as late.",
    targetRole: "student",
    postedBy: ANNO_SCHEDULER_ID,
    isPinned: false,
    expiresAt: new Date("2026-07-31T23:59:59Z"),
  },
  {
    id: "ann-004",
    title: "CI Grading Reminder — Submit Case Verifications by July 31",
    body: "Clinical Instructors are reminded to review and verify all pending duty verifications in the system. Students who completed duties in April, May, and June must have their cases confirmed before the end of July to avoid incomplete records. Please log in to the CI portal and process all waiting verifications.",
    targetRole: "ci",
    postedBy: ANNO_SCHEDULER_ID,
    isPinned: false,
  },
  {
    id: "ann-005",
    title: "New Hospital Partnership — The Medical City Ortigas",
    body: "We are pleased to announce that The Medical City Ortigas has been added as an affiliate clinical training site for AY 2026-2027. Fourth-year students will have opportunities for rotation at this facility. Duty assignments to The Medical City will begin in August 2026.",
    targetRole: "all",
    postedBy: ADMIN_DATA.id,
    isPinned: false,
  },
]).onConflictDoNothing();
console.log("  ✓ announcements (5)");

// ── 12. Schedules (120 duty schedules) ───────────────────────────────────────
const dutyDates = generateDutyDates();
console.log(`  Generating duty dates: ${dutyDates.length} total`);

const scheduleRows: typeof schedulesTable.$inferInsert[] = [];
const scheduleStudentRows: typeof scheduleStudentsTable.$inferInsert[] = [];

// Map section → student IDs
function studentsInSection(sectionIdx: number): string[] {
  const start = sectionIdx * STUDENTS_PER_SECTION;
  return Array.from({ length: STUDENTS_PER_SECTION }, (_, j) => `u-st-${pad(start + j + 1)}`);
}

// For 120 schedules: 8 per section × 15 sections
for (let secIdx = 0; secIdx < 15; secIdx++) {
  const sec = SECTIONS[secIdx];
  const sectionStudents = studentsInSection(secIdx);
  const sectionLabel = `${sec.yearLevel}${sec.section}`;

  for (let duty = 0; duty < 8; duty++) {
    const schedIdx = secIdx * 8 + duty;
    const hospitalIdx = (secIdx * 3 + duty) % HOSPITALS.length;
    const wardIdx = duty % WARDS.length;
    const ciIdx = (secIdx + duty) % CI_DATA.length;
    const shiftIdx = (secIdx + duty) % SHIFTS.length;
    const dateInfo = dutyDates[schedIdx] ?? dutyDates[dutyDates.length - 1];

    const hospital = HOSPITALS[hospitalIdx];
    const ward = WARDS[wardIdx];
    const ci = CI_DATA[ciIdx];
    const shift = SHIFTS[shiftIdx];
    const scheduler = SCHEDULER_DATA[schedIdx % 3];

    const status =
      dateInfo.isFuture ? "upcoming" :
      dateInfo.isCurrent ? "active" : "completed";

    const deptId = `dept-${hospital.id}-${ward.code.toLowerCase()}`;
    const schedId = `sched-${pad(schedIdx + 1, 4)}`;

    scheduleRows.push({
      id: schedId,
      title: `${sectionLabel} — ${ward.name}`,
      hospitalId: hospital.id,
      departmentId: deptId,
      ciId: ci.id,
      dutyDate: dateInfo.date,
      startTime: shift.start,
      endTime: shift.end,
      gracePeriodMin: 15,
      dutyHours: shift.hours,
      status,
      notes: `Clinical rotation for Section ${sectionLabel}. Students must complete assigned cases for ${ward.name}.`,
      maxStudents: 15,
      requiredYearLevel: sec.yearLevel,
      eligibleSections: sectionLabel,
      createdBy: scheduler.id,
    });

    // Assign 10–13 students from this section per schedule
    const assignCount = 10 + (schedIdx % 4);
    const offset = (duty * 3) % (STUDENTS_PER_SECTION - assignCount);
    const assigned = sectionStudents.slice(offset, offset + assignCount);

    for (const studentId of assigned) {
      scheduleStudentRows.push({
        scheduleId: schedId,
        studentId,
        recommendationScore: rng(schedIdx * 100 + parseInt(studentId.slice(-4)), 70, 100),
        recommendationReasons: ["Within hospital proximity","Section assigned","Available schedule slot"],
      });
    }
  }
}

for (const chunk of chunkArray(scheduleRows, 50)) {
  await db.insert(schedulesTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ schedules (${scheduleRows.length})`);

for (const chunk of chunkArray(scheduleStudentRows, 100)) {
  await db.insert(scheduleStudentsTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ schedule_students (${scheduleStudentRows.length})`);

// ── 13. Attendance records ────────────────────────────────────────────────────
// Only for past and current schedules
const attendanceRows: typeof attendanceTable.$inferInsert[] = [];

const pastOrCurrentSchedules = scheduleRows.filter(s =>
  s.status === "completed" || s.status === "active"
);

for (const sched of pastOrCurrentSchedules) {
  const assigned = scheduleStudentRows.filter(ss => ss.scheduleId === sched.id);
  const hospital = HOSPITALS.find(h => h.id === sched.hospitalId)!;
  const dutyDateObj = new Date(sched.dutyDate as string);

  for (const ss of assigned) {
    const seed = parseInt(ss.studentId!.slice(-4)) + parseInt(sched.id.slice(-4));
    const roll = rng(seed, 0, 99);

    let status: "present" | "late" | "absent" = "present";
    if (roll < 15) status = "absent";
    else if (roll < 30) status = "late";

    if (status === "absent") {
      attendanceRows.push({
        id: `att-${sched.id}-${ss.studentId}`,
        scheduleId: sched.id,
        studentId: ss.studentId!,
        ciId: sched.ciId,
        status: "absent",
        method: "manual",
        gpsVerified: false,
        faceVerified: false,
        livenessVerified: false,
        remarks: "Student did not report for duty",
        needsMakeup: true,
        makeupCompleted: false,
        isBuddyAttendance: false,
      });
    } else {
      // Time in with small offset for late
      const [startH, startM] = (sched.startTime as string).split(":").map(Number);
      const lateMin = status === "late" ? rng(seed, 16, 45) : rng(seed, -5, 10);
      const timeInH = startH + Math.floor((startM + lateMin) / 60);
      const timeInM = (startM + lateMin + 60) % 60;
      const timeIn = new Date(dutyDateObj);
      timeIn.setHours(timeInH, timeInM, 0, 0);

      const [endH, endM] = (sched.endTime as string).split(":").map(Number);
      const timeOut = new Date(dutyDateObj);
      timeOut.setHours(endH + (sched.endTime === "07:00" ? 1 : 0), endM, 0, 0);
      if (sched.endTime === "07:00") timeOut.setDate(timeOut.getDate() + 1);

      const actualHours = (timeOut.getTime() - timeIn.getTime()) / 3_600_000;

      // GPS: near hospital with small offset
      const latOffset = (rng(seed + 1, -50, 50)) / 10000;
      const lonOffset = (rng(seed + 2, -50, 50)) / 10000;

      const isBuddy = rng(seed + 3, 0, 99) < 20 && assigned.length > 1;
      let buddyId: string | null = null;
      if (isBuddy) {
        const others = assigned.filter(a => a.studentId !== ss.studentId);
        buddyId = others[rng(seed + 4, 0, others.length - 1)]!.studentId ?? null;
      }

      attendanceRows.push({
        id: `att-${sched.id}-${ss.studentId}`,
        scheduleId: sched.id,
        studentId: ss.studentId!,
        ciId: sched.ciId,
        timeIn,
        timeOut,
        dutyHours: parseFloat(actualHours.toFixed(2)),
        status,
        method: isBuddy ? "ci_assisted" : "biometric",
        studentLatitude: hospital.lat + latOffset,
        studentLongitude: hospital.lon + lonOffset,
        gpsVerified: true,
        faceVerified: !isBuddy,
        livenessVerified: !isBuddy,
        remarks: status === "late" ? `Student arrived ${Math.abs(lateMin)} minutes late` : null,
        needsMakeup: false,
        makeupCompleted: false,
        isBuddyAttendance: isBuddy,
        verifiedByStudentId: isBuddy ? buddyId : null,
        deviceId: `device-${ss.studentId}`,
      });
    }
  }
}

for (const chunk of chunkArray(attendanceRows, 80)) {
  await db.insert(attendanceTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ attendance (${attendanceRows.length})`);

// ── 14. Duty Verifications + Cases ────────────────────────────────────────────
const presentAttendance = attendanceRows.filter(a =>
  a.status === "present" || a.status === "late"
);

const verificationRows: typeof dutyVerificationsTable.$inferInsert[] = [];
const dvCaseRows: typeof dutyVerificationCasesTable.$inferInsert[] = [];
const caseCompletionRows: typeof caseCompletionsTable.$inferInsert[] = [];

// Build scheduleId → schedule map
const schedMap = new Map(scheduleRows.map(s => [s.id, s]));

// ~75% of present attendances have verifications
for (const att of presentAttendance) {
  const seed = parseInt(att.studentId!.slice(-4)) * 13 + parseInt(att.scheduleId.slice(-4));
  if (rng(seed, 0, 99) > 75) continue;   // 25% skip — student hasn't requested yet

  const sched = schedMap.get(att.scheduleId);
  if (!sched) continue;

  const dutyDate = sched.dutyDate as string;
  const wardCode = WARDS.find(w => `dept-${sched.hospitalId}-${w.code.toLowerCase()}` === sched.departmentId)?.code ?? "MSW";
  const availCases = WARD_CASES[wardCode] ?? WARD_CASES["MSW"];

  // Status distribution: older duties → more likely verified
  const dutyAge = (TODAY.getTime() - new Date(dutyDate).getTime()) / 86_400_000;
  let dvStatus: "waiting_ci" | "ci_verified" | "pending_scheduler" | "officially_verified";
  const r2 = rng(seed + 7, 0, 99);
  if (dutyAge > 60) {
    dvStatus = r2 < 80 ? "officially_verified" : r2 < 90 ? "pending_scheduler" : "ci_verified";
  } else if (dutyAge > 30) {
    dvStatus = r2 < 50 ? "officially_verified" : r2 < 75 ? "pending_scheduler" : r2 < 90 ? "ci_verified" : "waiting_ci";
  } else {
    dvStatus = r2 < 20 ? "officially_verified" : r2 < 45 ? "pending_scheduler" : r2 < 65 ? "ci_verified" : "waiting_ci";
  }

  const dvId = `dv-${att.scheduleId}-${att.studentId}`;
  const ciVerifiedAt = ["ci_verified","pending_scheduler","officially_verified"].includes(dvStatus)
    ? new Date(new Date(dutyDate).getTime() + 2 * 86_400_000) : null;
  const schedulerConfirmedAt = dvStatus === "officially_verified"
    ? new Date(new Date(dutyDate).getTime() + 4 * 86_400_000) : null;

  verificationRows.push({
    id: dvId,
    studentId: att.studentId!,
    scheduleId: att.scheduleId,
    attendanceId: att.id as string,
    hospitalId: sched.hospitalId as string,
    departmentId: sched.departmentId as string,
    ciId: sched.ciId as string,
    dutyDate,
    status: dvStatus,
    ciRemarks: ciVerifiedAt ? `All required cases completed. Student performed well during the ${wardCode} rotation.` : null,
    ciVerifiedAt,
    ciVerifiedBy: ciVerifiedAt ? sched.ciId as string : null,
    schedulerConfirmedAt,
    schedulerConfirmedBy: schedulerConfirmedAt ? SCHEDULER_DATA[parseInt(dvId.slice(-2), 36) % 3].id : null,
  });

  // 2–4 cases per verification
  const caseCount = 2 + (seed % 3);
  const selectedCases = availCases.slice(0, caseCount);
  for (let ci = 0; ci < selectedCases.length; ci++) {
    const caseId = selectedCases[ci];
    dvCaseRows.push({
      id: `dvc-${dvId}-${ci}`,
      dutyVerificationId: dvId,
      clinicalCaseId: caseId,
    });

    // Case completion record (in passport)
    const ccStatus = dvStatus === "officially_verified" ? "verified" :
                     dvStatus === "pending_scheduler"   ? "verified" :
                     dvStatus === "ci_verified"         ? "pending" : "pending";
    caseCompletionRows.push({
      id: `cc-comp-${dvId}-${ci}`,
      studentId: att.studentId!,
      clinicalCaseId: caseId,
      scheduleId: att.scheduleId,
      hospitalId: sched.hospitalId as string,
      departmentId: sched.departmentId as string,
      status: ccStatus as "pending" | "verified" | "rejected",
      verifiedAt: ccStatus === "verified" ? ciVerifiedAt : null,
      verifiedBy: ccStatus === "verified" ? sched.ciId as string : null,
      notes: ccStatus === "verified" ? "Competency demonstrated satisfactorily." : null,
    });
  }
}

for (const chunk of chunkArray(verificationRows, 50)) {
  await db.insert(dutyVerificationsTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ duty_verifications (${verificationRows.length})`);

for (const chunk of chunkArray(dvCaseRows, 100)) {
  await db.insert(dutyVerificationCasesTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ duty_verification_cases (${dvCaseRows.length})`);

for (const chunk of chunkArray(caseCompletionRows, 100)) {
  await db.insert(caseCompletionsTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ case_completions (${caseCompletionRows.length})`);

// ── 15. Evaluations ───────────────────────────────────────────────────────────
const evalRows: typeof evaluationsTable.$inferInsert[] = [];
for (const dv of verificationRows.filter(v =>
  v.status === "officially_verified" || v.status === "pending_scheduler"
)) {
  const seed = parseInt(dv.studentId!.slice(-4)) + 77;
  const rating = rng(seed, 3, 5);
  evalRows.push({
    id: `eval-${dv.id}`,
    scheduleId: dv.scheduleId,
    studentId: dv.studentId!,
    ciId: dv.ciId,
    rating,
    remarks:
      rating === 5 ? "Excellent performance. Student demonstrates strong clinical competence and professionalism." :
      rating === 4 ? "Very good performance. Student follows protocols correctly and shows initiative." :
                    "Satisfactory performance. Student meets basic clinical requirements.",
  });
}
for (const chunk of chunkArray(evalRows, 60)) {
  await db.insert(evaluationsTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ evaluations (${evalRows.length})`);

// ── 16. Notifications ─────────────────────────────────────────────────────────
const notifRows: typeof notificationsTable.$inferInsert[] = [];

// For each schedule, notify assigned students
for (const sched of scheduleRows) {
  const assigned = scheduleStudentRows.filter(ss => ss.scheduleId === sched.id);
  const hospital = HOSPITALS.find(h => h.id === sched.hospitalId)!;
  const ward = WARDS.find(w => `dept-${sched.hospitalId}-${w.code.toLowerCase()}` === sched.departmentId);

  for (const ss of assigned.slice(0, 5)) { // notify first 5 per schedule to keep total reasonable
    notifRows.push({
      id: `notif-assign-${sched.id}-${ss.studentId}`,
      userId: ss.studentId!,
      type: "duty_assigned",
      title: "New Duty Schedule Assigned",
      message: `You have been assigned to ${ward?.name ?? "Clinical Ward"} at ${hospital.name} on ${sched.dutyDate}. Duty hours: ${sched.startTime} – ${sched.endTime}. Please review your schedule.`,
      relatedEntity: "schedule",
      relatedId: sched.id,
      isRead: sched.status === "completed",
    });
  }
}

// Verification-related notifications
for (const dv of verificationRows) {
  if (dv.status === "officially_verified") {
    notifRows.push({
      id: `notif-dv-ok-${dv.id}`,
      userId: dv.studentId!,
      type: "verification_approved",
      title: "Duty Verification Officially Confirmed ✓",
      message: `Your duty verification for ${dv.dutyDate} has been officially confirmed by the Scheduler. Your clinical hours and case completions have been updated in your passport.`,
      relatedEntity: "duty_verification",
      relatedId: dv.id,
      isRead: true,
    });
  }
  if (dv.status === "pending_scheduler" || dv.status === "ci_verified") {
    notifRows.push({
      id: `notif-dv-ci-${dv.id}`,
      userId: dv.studentId!,
      type: "verification_pending",
      title: "Duty Verification — CI Verified",
      message: `Your Clinical Instructor has reviewed and verified your duty on ${dv.dutyDate}. It is now pending Scheduler confirmation.`,
      relatedEntity: "duty_verification",
      relatedId: dv.id,
      isRead: dv.status === "officially_verified",
    });
  }
  if (dv.status === "waiting_ci") {
    notifRows.push({
      id: `notif-dv-wait-${dv.id}`,
      userId: dv.studentId!,
      type: "verification_pending",
      title: "Duty Verification Submitted",
      message: `Your duty verification request for ${dv.dutyDate} has been submitted and is awaiting review by your Clinical Instructor.`,
      relatedEntity: "duty_verification",
      relatedId: dv.id,
      isRead: false,
    });
  }
}

// Attendance notifications for absent students
for (const att of attendanceRows.filter(a => a.status === "absent").slice(0, 80)) {
  const absDutyDate = schedMap.get(att.scheduleId as string)?.dutyDate ?? "your scheduled duty";
  notifRows.push({
    id: `notif-abs-${att.id}`,
    userId: att.studentId!,
    type: "attendance_missed",
    title: "Duty Absence Recorded",
    message: `You were marked absent for your clinical duty on ${absDutyDate}. Please coordinate with your Clinical Instructor regarding a makeup duty if required.`,
    relatedEntity: "attendance",
    relatedId: att.id as string,
    isRead: false,
  });
}

// Upcoming duty reminders for future schedules
for (const sched of scheduleRows.filter(s => s.status === "upcoming").slice(0, 15)) {
  const assigned = scheduleStudentRows.filter(ss => ss.scheduleId === sched.id);
  const hospital = HOSPITALS.find(h => h.id === sched.hospitalId)!;
  const ward = WARDS.find(w => `dept-${sched.hospitalId}-${w.code.toLowerCase()}` === sched.departmentId);
  for (const ss of assigned.slice(0, 3)) {
    notifRows.push({
      id: `notif-remind-${sched.id}-${ss.studentId}`,
      userId: ss.studentId!,
      type: "duty_reminder",
      title: `Upcoming Duty Reminder — ${sched.dutyDate}`,
      message: `Reminder: You have a clinical duty at ${hospital.name} (${ward?.name ?? "Clinical Ward"}) on ${sched.dutyDate} from ${sched.startTime} to ${sched.endTime}. Prepare your uniform and required materials.`,
      relatedEntity: "schedule",
      relatedId: sched.id,
      isRead: false,
    });
  }
}

// CI notifications
for (const dv of verificationRows.filter(v => v.status === "waiting_ci").slice(0, 30)) {
  notifRows.push({
    id: `notif-ci-pend-${dv.id}`,
    userId: dv.ciId,
    type: "verification_pending",
    title: "Student Duty Verification Awaiting Your Review",
    message: `A student has submitted a duty verification request for ${dv.dutyDate}. Please log in to review the submitted cases and provide your assessment.`,
    relatedEntity: "duty_verification",
    relatedId: dv.id,
    isRead: false,
  });
}

for (const chunk of chunkArray(notifRows, 80)) {
  await db.insert(notificationsTable).values(chunk).onConflictDoNothing();
}
console.log(`  ✓ notifications (${notifRows.length})`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n✅  SIPAG production seed complete!");
console.log("─────────────────────────────────────────────────────────────────");
console.log(`   👤  Users          : 1 admin + 3 schedulers + 15 CIs + 375 students`);
console.log(`   🏥  Hospitals      : ${HOSPITALS.length}`);
console.log(`   🏛   Departments    : ${deptRows.length} (7 wards × 10 hospitals)`);
console.log(`   📋  Clinical Cases : ${CLINICAL_CASES.length}`);
console.log(`   📅  Schedules      : ${scheduleRows.length}`);
console.log(`   👥  Assignments    : ${scheduleStudentRows.length} schedule-student pairs`);
console.log(`   ✅  Attendance     : ${attendanceRows.length}`);
console.log(`   🔍  Verifications  : ${verificationRows.length}`);
console.log(`   📁  Case Completions: ${caseCompletionRows.length}`);
console.log(`   ⭐  Evaluations    : ${evalRows.length}`);
console.log(`   🔔  Notifications  : ${notifRows.length}`);
console.log(`   📢  Announcements  : 5`);
console.log("─────────────────────────────────────────────────────────────────");
console.log("   Login:  admin@clinicalflow.edu.ph        / password123");
console.log("   Login:  scheduler@clinicalflow.edu.ph    / password123");
console.log("   Login:  m.ferrer@clinicalflow.edu.ph     / password123  (CI)");
console.log("   Login:  mariasantos.0001@student... see BSN-2026-0001  / password123");
console.log("─────────────────────────────────────────────────────────────────");
