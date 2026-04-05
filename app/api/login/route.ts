import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.APP_PASSWORD || "";

  if (!correct) {
    return NextResponse.json({ error: "APP_PASSWORD not configured" }, { status: 500 });
  }

  if (password !== correct) {
    return NextResponse.json({ error: "비밀번호가 틀렸어요" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("cothink_auth", correct, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
  });
  return res;
}
