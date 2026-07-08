import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await db.execute(sql`ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS hour_value real`);
  console.log("✓ hour_value on clinical_cases");
  await db.execute(sql`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS duty_hours real`);
  console.log("✓ duty_hours on schedules");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS academic_year_settings (
      id text PRIMARY KEY,
      school_year text NOT NULL,
      semester text NOT NULL,
      required_total_duty_hours integer NOT NULL DEFAULT 500,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  console.log("✓ academic_year_settings table");
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
