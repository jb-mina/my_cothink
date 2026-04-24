import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { approveInvitation } from "@/lib/invitation";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function requireAdmin() {
  const pw = process.env.APP_PASSWORD || "";
  const cookie = cookies().get("cothink_auth")?.value;
  if (!pw || cookie !== pw) redirect("/login");
}

async function approveAction(formData: FormData) {
  "use server";
  const pw = process.env.APP_PASSWORD || "";
  const cookie = cookies().get("cothink_auth")?.value;
  if (!pw || cookie !== pw) throw new Error("unauthorized");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return;
  await approveInvitation(email);
  revalidatePath("/admin");
}

export default async function AdminPage() {
  requireAdmin();
  const supabase = supabaseServer();
  const { data: pending } = await supabase
    .from("invitations")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  const { data: approved } = await supabase
    .from("invitations")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(20);

  return (
    <div className={styles.wrap}>
      <header className={styles.hdr}>
        <h1 className={styles.title}>coThink Admin</h1>
        <span className={styles.sub}>초대 요청 관리</span>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          대기 중 <span className={styles.count}>{pending?.length ?? 0}</span>
        </h2>
        {(pending ?? []).length === 0 ? (
          <p className={styles.empty}>대기 중인 요청이 없습니다.</p>
        ) : (
          <ul className={styles.list}>
            {pending!.map((row) => (
              <li key={row.email} className={styles.row}>
                <div className={styles.email}>{row.email}</div>
                <div className={styles.meta}>
                  {new Date(row.requested_at).toLocaleString("ko")}
                </div>
                <form action={approveAction}>
                  <input type="hidden" name="email" value={row.email} />
                  <button type="submit" className={styles.approve}>
                    승인 · 코드 발송
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          최근 승인 <span className={styles.count}>{approved?.length ?? 0}</span>
        </h2>
        {(approved ?? []).length === 0 ? (
          <p className={styles.empty}>아직 승인된 요청이 없습니다.</p>
        ) : (
          <ul className={styles.list}>
            {approved!.map((row) => (
              <li key={row.email} className={`${styles.row} ${styles.rowApproved}`}>
                <div className={styles.email}>{row.email}</div>
                <div className={styles.meta}>
                  {row.approved_at
                    ? new Date(row.approved_at).toLocaleString("ko")
                    : "-"}
                </div>
                <code className={styles.code}>{row.code}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
