import { supabaseServer } from "./supabase";

export type StoredThread = {
  id: string;
  title: string;
  createdAt: number;
  turns: unknown[];
};

type DbRow = {
  id: string;
  code: string;
  title: string;
  turns: unknown[];
  created_at: string;
  updated_at: string;
};

function toThread(row: DbRow): StoredThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    turns: Array.isArray(row.turns) ? row.turns : [],
  };
}

export async function listThreads(code: string): Promise<StoredThread[]> {
  const { data, error } = await supabaseServer()
    .from("threads")
    .select("id, code, title, turns, created_at, updated_at")
    .eq("code", code)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as DbRow[] | null)?.map(toThread) ?? [];
}

export async function upsertThread(
  code: string,
  t: { id: string; title: string; turns: unknown[]; createdAt: number }
): Promise<void> {
  const { error } = await supabaseServer()
    .from("threads")
    .upsert(
      {
        id: t.id,
        code,
        title: t.title,
        turns: t.turns,
        created_at: new Date(t.createdAt).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) throw new Error(error.message);
}

export async function deleteThread(code: string, id: string): Promise<void> {
  const { error } = await supabaseServer()
    .from("threads")
    .delete()
    .eq("code", code)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
