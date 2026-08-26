import Link from "next/link";

export default function AdminNav() {
  return (
    <header className="border-b border-[#DEE5E8] bg-[#0B1F33] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/admin" className="text-xl font-bold tracking-tight">Boatly Admin</Link>
          <p className="text-xs text-white/60">Internal Operations</p>
        </div>
        <nav className="flex flex-wrap gap-1 text-sm font-semibold text-white/80">
          <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-white/10">Overview</Link>
          <Link href="/admin/operators" className="rounded-xl px-3 py-2 hover:bg-white/10">Operatori</Link>
          <Link href="/admin/verifications" className="rounded-xl px-3 py-2 hover:bg-white/10">Verifiche</Link>
          <Link href="/admin/bookings" className="rounded-xl px-3 py-2 hover:bg-white/10">Booking</Link>
          <Link href="/admin/finance" className="rounded-xl px-3 py-2 hover:bg-white/10">Finance</Link>
          <Link href="/admin/cases" className="rounded-xl px-3 py-2 hover:bg-white/10">Casi</Link>
          <Link href="/admin/privacy" className="rounded-xl px-3 py-2 hover:bg-white/10">Privacy</Link>
        </nav>
      </div>
    </header>
  );
}
