"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseBrowser";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // Account already exists → just log them in with what they typed.
      if (/already|exist|registered/i.test(error.message)) {
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (e2) setErr("Vous avez déjà un compte avec cet e-mail. Cliquez sur « Se connecter » ci-dessous.");
        else router.replace("/generate");
        return;
      }
      setBusy(false);
      setErr(error.message);
      return;
    }
    setBusy(false);
    if (data.session) router.replace("/generate");
    else {
      // email confirmation may be required; try direct sign-in
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
      if (e2) setErr("Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.");
      else router.replace("/generate");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 22 }}><span className="logo-mark">◆</span> Dashboarding</div>
        <h2>Créer mon compte</h2>
        <p className="muted">Commencez à générer vos dashboards en quelques secondes.</p>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@spacefill.fr" />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Au moins 6 caractères" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Création…" : "Créer mon compte"}
          </button>
        </form>
        <p className="auth-foot">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
      </div>
    </div>
  );
}
