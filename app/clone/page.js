"use client";

import { useRef, useState } from "react";
import AppShell from "../components/AppShell";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function ClonePage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError("");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/clone-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError("La réponse n'a pas pu arriver. Réessaie dans un instant.");
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <AppShell title="Clone ChatGPT" subtitle="Discute avec l'IA, directement dans l'appli">
      <div className="card" style={{ display: "flex", flexDirection: "column", height: "70vh", padding: 0, overflow: "hidden" }}>
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.length === 0 && (
            <p className="sub" style={{ margin: "auto", textAlign: "center" }}>
              Pose ta première question pour démarrer la discussion.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "var(--green)" : "var(--bg)",
                color: m.role === "user" ? "#053a2a" : "var(--black)",
                border: m.role === "user" ? "none" : "1px solid var(--border)",
                borderRadius: 16,
                padding: "10px 16px",
                maxWidth: "75%",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div style={{ alignSelf: "flex-start", color: "var(--gray)", fontSize: 14 }}>L&apos;IA écrit…</div>
          )}
        </div>

        {error && <div className="alert alert-error" style={{ margin: "0 24px" }}>{error}</div>}

        <div style={{ borderTop: "1px solid var(--border)", padding: 16, display: "flex", gap: 10 }}>
          <textarea
            className="input"
            style={{ flex: 1, resize: "none", minHeight: 44 }}
            placeholder="Écris ton message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button className="btn btn-primary" onClick={() => send()} disabled={sending || !input.trim()}>
            Envoyer
          </button>
        </div>
      </div>
    </AppShell>
  );
}
