import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요" }, { status: 400 });
  }

  const rawValue =
    body && typeof body === "object" && "value" in body && typeof (body as { value: unknown }).value === "string"
      ? ((body as { value: string }).value).trim()
      : "";

  if (!rawValue) {
    return NextResponse.json({ error: "접속 코드 또는 비밀번호를 입력해주세요" }, { status: 400 });
  }

  const adminPassword = process.env.APP_PASSWORD || "";

  // 1) Admin path — exact APP_PASSWORD match
  if (adminPassword && rawValue === adminPassword) {
    const res = NextResponse.json({ ok: true, role: "admin" });
    res.cookies.set("cothink_auth", adminPassword, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30일
      path: "/",
    });
    return res;
  }

  // 2) User path — approved invitation code (codes are uppercase; normalize input)
  const code = rawValue.toUpperCase();
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("invitations")
      .select("email, status, code")
      .eq("code", code)
      .eq("status", "approved")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `인증 중 오류: ${error.message}` }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "코드 또는 비밀번호가 올바르지 않아요" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, role: "user" });
    res.cookies.set("cothink_auth", `u:${code}`, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
