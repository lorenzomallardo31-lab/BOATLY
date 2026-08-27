type SearchBarProps = {
  defaultQuery?: string;
  defaultDate?: string;
  defaultPassengers?: number;
  compact?: boolean;
};

export default function SearchBar({
  defaultQuery = "",
  defaultDate = "",
  defaultPassengers = 2,
  compact = false,
}: SearchBarProps) {
  return (
    <form
      action="/cerca"
      className={
        compact
          ? "grid gap-3 rounded-2xl border border-[#DEE5E8] bg-white p-3 shadow-sm md:grid-cols-[1.5fr_1fr_0.7fr_auto]"
          : "grid gap-3 rounded-3xl border border-white/50 bg-white p-3 shadow-xl md:grid-cols-[1.5fr_1fr_0.7fr_auto]"
      }
    >
      <label className="rounded-2xl px-4 py-2 hover:bg-[#F8FAF9]">
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          Dove
        </span>
        <input
          name="q"
          defaultValue={defaultQuery}
          className="mt-1 w-full bg-transparent text-base font-medium outline-none md:text-sm"
          placeholder="Napoli, Capri, Ischia..."
        />
      </label>

      <label className="rounded-2xl px-4 py-2 hover:bg-[#F8FAF9]">
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          Data
        </span>
        <input
          name="date"
          type="date"
          defaultValue={defaultDate}
          className="mt-1 w-full bg-transparent text-base font-medium outline-none md:text-sm"
        />
      </label>

      <label className="rounded-2xl px-4 py-2 hover:bg-[#F8FAF9]">
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          Persone
        </span>
        <input
          name="passengers"
          type="number"
          min={1}
          max={50}
          defaultValue={defaultPassengers}
          className="mt-1 w-full bg-transparent text-base font-medium outline-none md:text-sm"
        />
      </label>

      <button
        type="submit"
        className="rounded-2xl bg-[#14B8A6] px-6 py-4 text-sm font-bold text-white transition hover:opacity-90"
      >
        Cerca
      </button>
    </form>
  );
}
