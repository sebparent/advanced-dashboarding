"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr("E-mail ou mot de passe incorrect."); return; }
    router.replace("/generate");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 22 }}><span className="logo-mark">◆</span> Dashboarding</div>
        <h2>Se connecter</h2>
        <p className="muted">Heureux de vous revoir.</p>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@spacefill.fr" />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="auth-foot">Pas encore de compte ? <Link href="/signup">Créer un compte</Link></p>
      </div>
    </div>
  );
}
