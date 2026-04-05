"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pw, setPw]     = useState("");
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState(false);
  const router          = useRouter();

  const submit = async () => {
    if (!pw.trim()) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
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
      minHeight: "100vh", background: "#07090f", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{ width: 360, padding: "40px 36px", background: "#0c1220", border: "1px solid #1a2e44", borderRadius: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#42c8a0,#4285f4,#f5c842)" }} />
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: "#f5c842", marginBottom: 4 }}>coThink</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#2e4260", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 32 }}>MULTI-MODEL REASONING</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#3a5270", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>비밀번호</div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="••••••••"
          autoFocus
          style={{
            width: "100%", background: "#07090f", border: "1px solid #1a2e44",
            borderRadius: 7, padding: "10px 14px", color: "#d8e4f0",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 16,
            outline: "none", marginBottom: 12,
          }}
        />
        {err && (
          <div style={{ fontSize: 12, color: "#ff7070", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 12 }}>⚠ {err}</div>
        )}
        <button
          onClick={submit}
          disabled={busy || !pw.trim()}
          style={{
            width: "100%", padding: "10px", background: busy ? "#b89030" : "#f5c842",
            color: "#07090f", fontFamily: "'Syne',sans-serif", fontWeight: 800,
            fontSize: 13, border: "none", borderRadius: 7, cursor: busy ? "not-allowed" : "pointer",
            transition: "all .15s",
          }}
        >
          {busy ? "확인 중..." : "→ 입장"}
        </button>
      </div>
    </div>
  );
}
