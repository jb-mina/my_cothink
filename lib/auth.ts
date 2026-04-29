import { cookies } from "next/headers";

export function getCurrentCode(): string | null {
  const raw = cookies().get("cothink_auth")?.value;
  if (!raw || !raw.startsWith("u:")) return null;
  return raw.slice(2);
}
