"use server";

import { revalidatePath } from "next/cache";

import { CustomerCsvError, parseCustomerCsv } from "@/lib/operator/customer-csv";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type CustomerImportIssue = { row: number; code: string };
export type CustomerImportState = {
  status: "idle" | "error" | "complete";
  code?: string;
  created?: number;
  issues?: CustomerImportIssue[];
};

export async function importCustomers(
  _previousState: CustomerImportState,
  formData: FormData,
): Promise<CustomerImportState> {
  const operatorIdValue = formData.get("operator_id");
  const fileValue = formData.get("csv_file");
  if (typeof operatorIdValue !== "string" || !(fileValue instanceof File) || fileValue.size === 0) {
    return { status: "error", code: "missing-file" };
  }
  if (fileValue.size > 1_000_000) return { status: "error", code: "file-too-large" };

  let rows;
  try {
    rows = parseCustomerCsv(await fileValue.text());
  } catch (error) {
    return { status: "error", code: error instanceof CustomerCsvError ? error.code : "invalid-file" };
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorIdValue);
  const { data, error } = await supabase.rpc("operator_import_customers", {
    p_operator_id: operator.id,
    p_rows: rows,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return { status: "error", code: "import-failed" };
  }

  const record = data as { created?: unknown; errors?: unknown };
  const created = typeof record.created === "number" ? record.created : 0;
  const issues = Array.isArray(record.errors)
    ? record.errors.filter((item): item is CustomerImportIssue => Boolean(item && typeof item === "object" && typeof (item as CustomerImportIssue).row === "number" && typeof (item as CustomerImportIssue).code === "string"))
    : [];

  revalidatePath("/operator/customers");
  return { status: "complete", created, issues };
}
