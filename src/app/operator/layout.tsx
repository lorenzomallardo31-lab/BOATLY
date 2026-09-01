import type { ReactNode } from "react";

import { getAdminOperatorSupportContext } from "@/lib/admin/support-context";

import { endAdminOperatorSupport } from "./support-actions";

type OperatorLayoutProps = Readonly<{
  children: ReactNode;
}>;

function expiryLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export default async function OperatorLayout({ children }: OperatorLayoutProps) {
  const support = await getAdminOperatorSupportContext();

  return (
    <>
      {support ? (
        <aside className="sticky top-0 z-[70] border-b border-amber-300 bg-amber-100 px-3 py-2 text-amber-950 shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:px-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">
                Modalità assistenza admin
              </p>
              <p className="truncate text-xs font-semibold sm:text-sm">
                Stai operando in {support.operatorName}. Tutte le modifiche sono registrate · sessione fino alle {expiryLabel(support.expiresAt)}.
              </p>
            </div>
            <form action={endAdminOperatorSupport}>
              <input type="hidden" name="operator_id" value={support.operatorId} />
              <button className="min-h-9 rounded-xl bg-amber-950 px-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0">
                Esci e torna all’admin
              </button>
            </form>
          </div>
        </aside>
      ) : null}
      <div className={support ? "[&_.operator-primary-nav]:top-[4.5rem] sm:[&_.operator-primary-nav]:top-[3.25rem]" : ""}>
        {children}
      </div>
    </>
  );
}
