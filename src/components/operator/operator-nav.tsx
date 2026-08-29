"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type OperatorNavProps = {
  operatorId: string;
  operatorName: string;
};

type IconName = "home" | "calendar" | "booking" | "finance" | "customers" | "fleet" | "team";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  mobileLabel: string;
  icon: IconName;
}> = [
  { href: "/operator/dashboard", label: "Dashboard", mobileLabel: "Home", icon: "home" },
  { href: "/operator/calendar", label: "Calendario", mobileLabel: "Agenda", icon: "calendar" },
  { href: "/operator/bookings", label: "Prenotazioni", mobileLabel: "Booking", icon: "booking" },
  { href: "/operator/finance", label: "Finanza", mobileLabel: "Cassa", icon: "finance" },
  { href: "/operator/customers", label: "Clienti", mobileLabel: "Clienti", icon: "customers" },
  { href: "/operator/fleet", label: "Flotta", mobileLabel: "Flotta", icon: "fleet" },
  { href: "/operator/team", label: "Team", mobileLabel: "Team", icon: "team" },
];

function NavIcon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>;
  }
  if (name === "calendar") {
    return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>;
  }
  if (name === "booking") {
    return <svg {...common}><path d="M7 3h10a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6M9 12h6" /></svg>;
  }
  if (name === "finance") {
    return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></svg>;
  }
  if (name === "customers") {
    return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  }
  if (name === "fleet") {
    return <svg {...common}><path d="M3 18h18l-2 3H5l-2-3Z" /><path d="m5 18 2-9h10l2 9M9 9V5h6v4" /><path d="M12 2v3" /></svg>;
  }
  return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M17 8h6M20 5v6" /></svg>;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function OperatorNav({ operatorId, operatorName }: OperatorNavProps) {
  const pathname = usePathname();
  const suffix = `?operator=${encodeURIComponent(operatorId)}`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171A2B] text-white shadow-[0_10px_30px_rgba(23,26,43,0.12)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={`/operator/dashboard${suffix}`} className="min-w-0">
            <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#6D5DFB] text-sm">B</span>
              Boatly Ops
            </span>
            <span className="mt-0.5 block truncate pl-10 text-[11px] text-[#C9C5E8]">{operatorName}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigazione gestionale">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={`${item.href}${suffix}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-white text-[#3F34B5]" : "text-[#D8D5E5] hover:bg-white/10 hover:text-white"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/account"
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-[#EEEFFC] transition hover:bg-white/10"
          >
            Account
          </Link>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-7 border-t border-[#D8D5E5] bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-12px_32px_rgba(23,26,43,0.12)] backdrop-blur lg:hidden"
        aria-label="Navigazione gestionale mobile"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition ${active ? "bg-[#EDE9FE] text-[#4C3FC2]" : "text-[#676B80]"}`}
            >
              <NavIcon name={item.icon} />
              {item.mobileLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
