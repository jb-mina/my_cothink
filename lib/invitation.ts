import crypto from "crypto";
import { Resend } from "resend";
import { supabaseServer } from "./supabase";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

export function generateCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  return new Resend(key);
}

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

export async function sendInvitationEmail(email: string, code: string) {
  const resend = getResend();
  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "coThink 초대장이 도착했습니다",
    html: `
      <div style="font-family: -apple-system, 'Pretendard', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1C1816;">
        <h1 style="font-size: 24px; margin: 0 0 20px; letter-spacing: -0.02em;">coThink 초대장</h1>
        <p style="font-size: 15px; line-height: 1.7; color: #6B6258; margin: 0 0 24px;">
          coThink 베타 접속이 승인되었습니다. 아래 코드를 로그인 페이지에 입력하세요.
        </p>
        <div style="background: #FAF7F2; border: 1px solid #E2D9CC; border-radius: 12px; padding: 20px 24px; text-align: center; margin: 0 0 24px;">
          <div style="font-family: ui-monospace, 'SFMono-Regular', monospace; font-size: 22px; letter-spacing: 0.15em; font-weight: 600; color: #D96628;">${code}</div>
        </div>
        <a href="https://getcothink.com/login" style="display: inline-block; padding: 12px 24px; background: #D96628; color: white; text-decoration: none; border-radius: 9px; font-size: 14px; font-weight: 600;">로그인하러 가기</a>
        <p style="font-size: 12px; color: #9C9088; margin: 32px 0 0;">
          이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.
        </p>
      </div>
    `,
  });
}

export async function sendAdminNotification(requesterEmail: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  const resend = getResend();
  await resend.emails.send({
    from: fromAddress(),
    to: adminEmail,
    subject: `[coThink] 신규 초대 요청: ${requesterEmail}`,
    html: `
      <div style="font-family: -apple-system, 'Pretendard', sans-serif;">
        <p>새 초대 요청이 들어왔습니다.</p>
        <p><strong>${requesterEmail}</strong></p>
        <p><a href="https://getcothink.com/admin">관리자 페이지에서 승인하기</a></p>
      </div>
    `,
  });
}

export async function approveInvitation(email: string) {
  const supabase = supabaseServer();
  const code = generateCode();
  const { error } = await supabase
    .from("invitations")
    .update({
      status: "approved",
      code,
      approved_at: new Date().toISOString(),
    })
    .eq("email", email)
    .eq("status", "pending");

  if (error) throw new Error(`DB update failed: ${error.message}`);

  await sendInvitationEmail(email, code);
  return code;
}
