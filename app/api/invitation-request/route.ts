import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { sendAdminNotification } from "@/lib/invitation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const supabase = supabaseServer();

    const { data: existing } = await supabase
      .from("invitations")
      .select("email, status")
      .eq("email", normalized)
      .maybeSingle();

    if (existing?.status === "approved") {
      return NextResponse.json({ ok: true, alreadyApproved: true });
    }
    if (existing?.status === "pending") {
      return NextResponse.json({ ok: true, alreadyRequested: true });
    }

    const { error } = await supabase.from("invitations").insert({
      email: normalized,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
    }

    // 관리자 알림 이메일 (실패해도 요청 자체는 성공 처리)
    sendAdminNotification(normalized).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
