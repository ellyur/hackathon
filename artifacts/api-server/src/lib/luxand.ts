/**
 * Luxand.cloud face recognition helpers.
 * All API calls go server-side — the token never reaches the browser.
 */

const BASE = "https://api.luxand.cloud";

function token(): string {
  const t = process.env["LUXAND_API_TOKEN"];
  if (!t) throw new Error("LUXAND_API_TOKEN is not set");
  return t;
}

/** Create a new person/subject. Returns the UUID assigned by Luxand. */
export async function createPerson(name: string): Promise<string> {
  const form = new FormData();
  form.append("name", name);
  const res = await fetch(`${BASE}/subject`, {
    method: "POST",
    headers: { token: token() },
    body: form,
  });
  const data = (await res.json()) as { uuid?: string; message?: string };
  if (!res.ok || !data.uuid) {
    throw new Error(data.message ?? "Luxand: failed to create person");
  }
  return data.uuid;
}

/** Add a JPEG image to an existing person to improve recognition accuracy. */
export async function addPhotoToPerson(
  personUuid: string,
  imageBuffer: Buffer,
): Promise<void> {
  const form = new FormData();
  form.append(
    "photo",
    new Blob([imageBuffer], { type: "image/jpeg" }),
    "face.jpg",
  );
  const res = await fetch(`${BASE}/subject/${personUuid}`, {
    method: "POST",
    headers: { token: token() },
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Luxand: failed to add photo");
  }
}

export interface LuxandMatch {
  uuid: string;
  name: string;
  probability: number;
}

/**
 * Search for a person in a photo.
 * Returns the top matches sorted by probability (highest first).
 */
export async function searchFace(imageBuffer: Buffer): Promise<LuxandMatch[]> {
  const form = new FormData();
  form.append(
    "photo",
    new Blob([imageBuffer], { type: "image/jpeg" }),
    "verify.jpg",
  );
  const res = await fetch(`${BASE}/photo/search`, {
    method: "POST",
    headers: { token: token() },
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Luxand: face search failed");
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as LuxandMatch[]) : [];
}

/** Delete a person from Luxand (used on re-enroll to start fresh). */
export async function deletePerson(personUuid: string): Promise<void> {
  await fetch(`${BASE}/subject/${personUuid}`, {
    method: "DELETE",
    headers: { token: token() },
  });
}
