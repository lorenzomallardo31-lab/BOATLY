import Link from "next/link";

export default function AdminNav() {
  return (
    <header className="border-b border-[#DEE5E8] bg-[#0B1F33] text-white">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:px-8">
        <div>
          <Link href="/admin/operators" className="text-xl font-bold tracking-tight">Boatly Ops Admin</Link>
          <p className="text-xs text-white/60">Amministratore unico</p>
        </div>
        <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto text-sm font-semibold text-white/80 lg:mt-0">
          <Link href="/admin/operators" className="shrink-0 rounded-xl px-3 py-2 hover:bg-white/10">Noleggiatori</Link>
          <Link href="/account" className="shrink-0 rounded-xl px-3 py-2 hover:bg-white/10">Account</Link>
        </nav>
      </div>
    </header>
  );
}
