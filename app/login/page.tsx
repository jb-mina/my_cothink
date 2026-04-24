"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [value, setValue] = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);
  const router            = useRouter();

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "오류가 발생했어요"); setBusy(false); return; }
      router.push("/");
      router.refresh();
    } catch {
      setErr("네트워크 오류"); setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background:
        "radial-gradient(1100px 380px at 85% -10%, rgba(217, 102, 40, 0.12), transparent 60%), linear-gradient(180deg, #fdfaf4 0%, #faf7f2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
      padding: 24,
    }}>
      <div style={{
        width: 400, padding: "44px 40px",
        background: "#ffffff",
        border: "1px solid #e2d9cc",
        borderRadius: 14,
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "0 20px 60px -24px rgba(28, 24, 22, 0.10), 0 4px 16px -8px rgba(28, 24, 22, 0.06)",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #d96628 0%, #e8946a 50%, #f3b48a 100%)",
        }} />

        <a href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          textDecoration: "none", marginBottom: 28,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#1c1816", color: "#faf7f2",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14,
          }}>co</div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 20, fontWeight: 800,
            color: "#1c1816", letterSpacing: "-0.02em",
          }}>coThink</div>
        </a>

        <div style={{
          fontFamily: "var(--font-sans)",
          fontSize: 22, fontWeight: 700,
          color: "#1c1816", letterSpacing: "-0.02em",
          marginBottom: 6,
        }}>다시 오셨네요</div>
        <div style={{
          fontSize: 14, color: "#6b6258", lineHeight: 1.55,
          marginBottom: 28,
        }}>이메일로 받은 접속 코드를 입력해 주세요.</div>

        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "#9c9088", letterSpacing: "0.15em",
          textTransform: "uppercase", marginBottom: 8,
        }}>접속 코드</div>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="이메일로 받은 10자리 코드"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            background: "#faf7f2",
            border: "1px solid #e2d9cc",
            borderRadius: 9,
            padding: "12px 14px",
            color: "#1c1816",
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            letterSpacing: "0.04em",
            outline: "none",
            marginBottom: 12,
            transition: "border-color .15s, background .15s",
            boxSizing: "border-box",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "#d96628"; e.currentTarget.style.background = "#fff"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "#e2d9cc"; e.currentTarget.style.background = "#faf7f2"; }}
        />
        {err && (
          <div style={{
            fontSize: 12, color: "#c24c2a",
            fontFamily: "var(--font-mono)", marginBottom: 12,
          }}>⚠ {err}</div>
        )}
        <button
          onClick={submit}
          disabled={busy || !value.trim()}
          style={{
            width: "100%",
            padding: "13px",
            background: busy ? "#b8541f" : "#d96628",
            color: "#ffffff",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            borderRadius: 9,
            cursor: busy || !value.trim() ? "not-allowed" : "pointer",
            opacity: !value.trim() && !busy ? 0.55 : 1,
            transition: "background .15s, opacity .15s",
          }}
        >
          {busy ? "확인 중..." : "→ 입장"}
        </button>

        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: "1px solid #ece3d5",
          fontSize: 13, color: "#6b6258",
          textAlign: "center",
        }}>
          아직 초대 코드가 없으신가요?{" "}
          <a href="/" style={{
            color: "#d96628", fontWeight: 600, textDecoration: "none",
          }}>초대 요청하기</a>
        </div>
      </div>
    </div>
  );
}
