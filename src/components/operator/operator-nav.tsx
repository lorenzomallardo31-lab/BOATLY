import Link from "next/link";

type OperatorNavProps = {
  operatorId: string;
  operatorName: string;
};

export default function OperatorNav({ operatorId, operatorName }: OperatorNavProps) {
  const suffix = `?operator=${encodeURIComponent(operatorId)}`;

  return (
    <header className="border-b border-[#DEE5E8] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="text-xl font-bold tracking-tight text-[#0B1F33]">
            Boatly
          </Link>
          <p className="text-xs text-[#64748B]">{operatorName}</p>
        </div>

        <nav className="flex flex-wrap gap-1 text-sm font-semibold text-[#475569]">
          <Link href={`/operator/dashboard${suffix}`} className="rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Dashboard</Link>
          <Link href={`/operator/bookings${suffix}`} className="rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Prenotazioni</Link>
          <Link href={`/operator/customers${suffix}`} className="rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Clienti</Link>
          <Link href={`/operator/fleet${suffix}`} className="rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Flotta</Link>
          <Link href="/account" className="rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Account</Link>
        </nav>
      </div>
    </header>
  );
}
