import type { DemoValidationIssue } from "@/lib/demo/validation";

export function DemoValidationSummary({ issues }: { issues: DemoValidationIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div role="alert" aria-live="assertive" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <p className="text-sm font-semibold">Operazione bloccata: correggi questi dati</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5">
        {issues.map((issue, index) => (
          <li key={`${issue.field}-${issue.message}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}
