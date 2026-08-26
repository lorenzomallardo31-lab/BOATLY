import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

import { reviewBoatPublication, reviewOperatorVerification } from "./actions";

type PageProps = { searchParams: Promise<{ reviewed?: string; error?: string }> };

export default async function AdminVerificationsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext(["SUPER_ADMIN", "ADMIN", "COMPLIANCE", "MODERATOR"]);

  const [{ data: operatorReviews, error: operatorError }, { data: boatReviews, error: boatError }] = await Promise.all([
    supabase.from("operator_verifications").select("id, operator_id, status, submitted_at, decision_note").in("status", ["PENDING", "IN_REVIEW", "NEEDS_CHANGES"]).order("submitted_at", { ascending: true }),
    supabase.from("boat_publication_reviews").select("id, operator_id, boat_id, status, submitted_at, decision_note").in("status", ["PENDING", "IN_REVIEW", "NEEDS_CHANGES"]).order("submitted_at", { ascending: true }),
  ]);
  if (operatorError || boatError) throw new Error("Unable to load verification queues.");

  const operatorIds = Array.from(new Set([...(operatorReviews ?? []).map((r)=>r.operator_id), ...(boatReviews ?? []).map((r)=>r.operator_id)]));
  const boatIds = Array.from(new Set((boatReviews ?? []).map((r)=>r.boat_id)));
  const [{ data: operators }, { data: boats }] = await Promise.all([
    operatorIds.length ? supabase.from("operators").select("id, name, status").in("id", operatorIds) : Promise.resolve({ data: [] }),
    boatIds.length ? supabase.from("boats").select("id, name, status").in("id", boatIds) : Promise.resolve({ data: [] }),
  ]);
  const operatorMap = new Map((operators ?? []).map((o)=>[o.id,o]));
  const boatMap = new Map((boats ?? []).map((b)=>[b.id,b]));

  const reviewButtons = (kind: "operator" | "boat", reviewId: string) => {
    const action = kind === "operator" ? reviewOperatorVerification : reviewBoatPublication;
    return <form action={action} className="mt-4 space-y-3"><input type="hidden" name="review_id" value={reviewId}/><textarea name="note" rows={2} placeholder="Nota decisione (obbligatoria per modifiche/rifiuto)" className="w-full rounded-xl border border-[#DEE5E8] px-3 py-2 text-sm"/><div className="flex flex-wrap gap-2"><button name="decision" value="APPROVED" className="rounded-xl bg-[#14B8A6] px-4 py-2 text-xs font-semibold text-white">Approva</button><button name="decision" value="NEEDS_CHANGES" className="rounded-xl border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-800">Richiedi modifiche</button><button name="decision" value="REJECTED" className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700">Rifiuta</button></div></form>;
  };

  return <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]"><AdminNav/><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><p className="text-sm font-semibold text-[#14B8A6]">Compliance queue</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Verifiche</h1>{query.reviewed ? <div className="mt-5 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">Decisione salvata: <strong>{query.reviewed}</strong>.</div>:null}{query.error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</div>:null}<div className="mt-8 grid gap-8 lg:grid-cols-2"><section><h2 className="text-xl font-semibold">Operatori ({(operatorReviews??[]).length})</h2><div className="mt-4 space-y-4">{(operatorReviews??[]).map((review)=>{const operator=operatorMap.get(review.operator_id);return <article key={review.id} className="rounded-3xl border border-[#DEE5E8] bg-white p-5 shadow-sm"><div className="flex justify-between gap-4"><div><p className="font-semibold">{operator?.name ?? review.operator_id}</p><p className="mt-1 text-xs text-[#64748B]">Operator: {operator?.status ?? "—"}</p></div><span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">{review.status}</span></div>{reviewButtons("operator",review.id)}</article>})}{(operatorReviews??[]).length===0?<p className="text-sm text-[#64748B]">Nessuna review aperta.</p>:null}</div></section><section><h2 className="text-xl font-semibold">Pubblicazioni barche ({(boatReviews??[]).length})</h2><div className="mt-4 space-y-4">{(boatReviews??[]).map((review)=>{const operator=operatorMap.get(review.operator_id);const boat=boatMap.get(review.boat_id);return <article key={review.id} className="rounded-3xl border border-[#DEE5E8] bg-white p-5 shadow-sm"><div className="flex justify-between gap-4"><div><p className="font-semibold">{boat?.name ?? review.boat_id}</p><p className="mt-1 text-xs text-[#64748B]">{operator?.name ?? review.operator_id} · Fleet {boat?.status ?? "—"}</p></div><span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">{review.status}</span></div>{reviewButtons("boat",review.id)}</article>})}{(boatReviews??[]).length===0?<p className="text-sm text-[#64748B]">Nessuna review aperta.</p>:null}</div></section></div></div></main>;
}
