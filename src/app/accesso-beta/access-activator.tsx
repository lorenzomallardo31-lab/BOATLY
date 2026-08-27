"use client";

import { useEffect, useState } from "react";

type AccessActivatorProps = {
  nextPath: string;
};

type AccessState = "waiting" | "activating" | "invalid" | "unavailable";

function readTokenFromFragment() {
  const fragment = window.location.hash.slice(1);

  if (!fragment) {
    return null;
  }

  const values = new URLSearchParams(fragment);
  const token = values.get("token");

  return token?.trim() || null;
}

export default function AccessActivator({ nextPath }: AccessActivatorProps) {
  const [state, setState] = useState<AccessState>("activating");

  useEffect(() => {
    const token = readTokenFromFragment();

    if (!token) {
      window.setTimeout(() => setState("waiting"), 0);
      return;
    }

    const activate = async () => {
      try {
        const response = await fetch("/api/beta-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });

        window.history.replaceState(null, "", window.location.pathname + window.location.search);

        if (response.ok) {
          window.location.replace(nextPath);
          return;
        }

        setState(response.status === 503 ? "unavailable" : "invalid");
      } catch {
        setState("unavailable");
      }
    };

    void activate();
  }, [nextPath]);

  if (state === "activating") {
    return (
      <div className="mt-8 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-5 text-sm leading-6">
        <strong>Accesso in attivazione.</strong>
        <br />
        Stiamo aprendo l&apos;anteprima privata sul tuo dispositivo.
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
        <strong>Invito non valido o non più attivo.</strong>
        <br />
        Chiedi a chi ti ha invitato un nuovo link completo.
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <strong>Anteprima momentaneamente non disponibile.</strong>
        <br />
        Riprova tra qualche minuto oppure contatta chi ti ha inviato il link.
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-[#DEE5E8] bg-[#F1F5F4] p-5 text-sm leading-6 text-[#475569]">
      Questa è un&apos;anteprima privata. Per entrare devi aprire il link completo
      ricevuto direttamente dal team Boatly.
    </div>
  );
}
