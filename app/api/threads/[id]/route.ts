import { NextRequest, NextResponse } from "next/server";
import { getCurrentCode } from "../../../../lib/auth";
import { upsertThread, deleteThread } from "../../../../lib/threads";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const code = getCurrentCode();
  if (!code) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = params.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title : "";
    const turns = Array.isArray(body?.turns) ? body.turns : [];
    const createdAt = typeof body?.createdAt === "number" ? body.createdAt : Date.now();
    if (!title) return NextResponse.json({ error: "missing title" }, { status: 400 });
    await upsertThread(code, { id, title, turns, createdAt });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const code = getCurrentCode();
  if (!code) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = params.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    await deleteThread(code, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
