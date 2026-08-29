"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Preview = { operatorId: string; operatorName: string; email: string; role: string; expiresAt: string };
type State = { kind: "loading" | "unauthenticated" | "check-email" | "invalid" | "ready" | "accepting" | "error"; preview?: Preview; token?: string; invitedEmail?: string };

function tokenFromHash() {
  const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("token")?.trim();
  return fragmentToken || window.sessionStorage.getItem("boatly_team_invite_token") || "";
}

export default function InvitationAcceptor() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const rawToken = tokenFromHash();
    if (!rawToken) { window.setTimeout(() => setState({ kind: "invalid" }), 0); return; }
    void fetch("/api/team/invitation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", token: rawToken }), cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          const body = await response.json() as { valid?: boolean; invitedEmail?: string };
          if (!body.valid || !body.invitedEmail) { setState({ kind: "invalid" }); return; }
          window.sessionStorage.setItem("boatly_team_invite_token", rawToken);
          setState({ kind: "unauthenticated", token: rawToken, invitedEmail: body.invitedEmail });
          return;
        }
        if (!response.ok) { setState({ kind: "invalid" }); return; }
        const body = await response.json() as { preview: Preview };
        setState({ kind: "ready", preview: body.preview, token: rawToken });
      })
      .catch(() => setState({ kind: "error" }));
  }, []);

  async function accept() {
    setState((current) => ({ ...current, kind: "accepting" }));
    try {
      const response = await fetch("/api/team/invitation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", token: state.token ?? tokenFromHash() }), cache: "no-store" });
      const body = await response.json() as { operatorId?: string };
      if (!response.ok || !body.operatorId) { setState({ kind: response.status === 401 ? "unauthenticated" : "error" }); return; }
      window.history.replaceState(null, "", window.location.pathname);
      window.sessionStorage.removeItem("boatly_team_invite_token");
      window.location.replace(`/operator/dashboard?operator=${encodeURIComponent(body.operatorId)}`);
    } catch { setState({ kind: "error" }); }
  }

  if (state.kind === "loading") return <p className="mt-6 text-sm text-[#676B80]">Verifica dell’invito…</p>;
  if (state.kind === "unauthenticated") {
    const next = `/team/invite#token=${encodeURIComponent(state.token ?? "")}`;
    return <div className="mt-6"><p className="text-sm leading-6 text-[#676B80]">Accedi con <strong>{state.invitedEmail}</strong>. Se non hai ancora un account Boatly, puoi crearlo qui senza uscire dall’invito.</p><div className="mt-5"><Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white">Ho già un account</Link></div><InviteSignUp email={state.invitedEmail ?? ""} onComplete={() => setState((current) => ({ ...current, kind: "check-email" }))} /></div>;
  }
  if (state.kind === "check-email") return <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Account creato.</strong><br />Conferma l’email, poi riapri questo invito sullo stesso dispositivo e premi Accetta.</div>;
  if (state.kind === "invalid") return <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Invito assente, scaduto, revocato o destinato a un’altra email.</div>;
  if (state.kind === "error") return <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Non è stato possibile accettare l’invito. Riprova o chiedi un nuovo link.</div>;
  return <div className="mt-6"><div className="rounded-2xl bg-[#F4F2FA] p-5"><p className="text-sm text-[#676B80]">Workspace</p><p className="mt-1 text-xl font-semibold">{state.preview?.operatorName}</p><p className="mt-3 text-sm">Ruolo: <strong>{state.preview?.role}</strong></p><p className="mt-1 break-all text-xs text-[#676B80]">Account: {state.preview?.email}</p></div><button onClick={accept} disabled={state.kind === "accepting"} className="mt-5 min-h-12 w-full rounded-xl bg-[#6D5DFB] px-5 text-sm font-semibold text-white disabled:opacity-50">{state.kind === "accepting" ? "Attivazione…" : "Accetta e apri il gestionale"}</button></div>;
}

function InviteSignUp({ email, onComplete }: { email: string; onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12) { setError("Usa almeno 12 caratteri."); return; }
    setPending(true); setError("");
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setPending(false);
    if (signUpError) { setError("Registrazione non riuscita. L’account potrebbe esistere già: prova ad accedere."); return; }
    onComplete();
  }
  return <form onSubmit={submit} className="mt-5 rounded-2xl bg-[#F4F2FA] p-4"><p className="text-sm font-semibold">Nuovo account collaboratore</p><label className="mt-3 grid gap-2 text-xs font-semibold">Email<input value={email} readOnly className="min-h-11 rounded-xl border border-[#D8D5E5] bg-white px-3 text-sm" /></label><label className="mt-3 grid gap-2 text-xs font-semibold">Password *<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={12} required autoComplete="new-password" className="min-h-11 rounded-xl border border-[#D8D5E5] bg-white px-3 text-sm" /></label>{error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}<button disabled={pending} className="mt-4 min-h-11 w-full rounded-xl border border-[#6D5DFB] bg-white px-4 text-sm font-semibold text-[#4C3FC2] disabled:opacity-50">{pending ? "Registrazione…" : "Crea account"}</button></form>;
}
