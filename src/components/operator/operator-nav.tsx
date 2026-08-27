import Link from "next/link";

type OperatorNavProps = {
  operatorId: string;
  operatorName: string;
};

export default function OperatorNav({ operatorId, operatorName }: OperatorNavProps) {
  const suffix = `?operator=${encodeURIComponent(operatorId)}`;

  return (
    <header className="border-b border-[#DEE5E8] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:px-8">
        <div>
          <Link href="/" className="text-xl font-bold tracking-tight text-[#0B1F33]">
            Boatly
          </Link>
          <p className="text-xs text-[#64748B]">{operatorName}</p>
        </div>

        <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto text-sm font-semibold text-[#475569] lg:mt-0">
          <Link href={`/operator/dashboard${suffix}`} className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Dashboard</Link>
          <Link href={`/operator/bookings${suffix}`} className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Prenotazioni</Link>
          <Link href={`/operator/customers${suffix}`} className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Clienti</Link>
          <Link href={`/operator/fleet${suffix}`} className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Flotta</Link>
          <Link href="/account" className="shrink-0 rounded-xl px-3 py-2 hover:bg-[#F1F5F4]">Account</Link>
        </nav>
      </div>
    </header>
  );
}
