"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformContext } from "@/lib/admin/context";
import { createAdminClient } from "@/lib/supabase/admin";

async function listStorageFiles(bucket: string, prefix = ""): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw new Error(`Unable to list ${bucket}: ${error.message}`);

  const files: string[] = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) files.push(path);
    else files.push(...(await listStorageFiles(bucket, path)));
  }
  return files;
}

export async function cleanupPilotStorage() {
  await requirePlatformContext(["SUPER_ADMIN"]);
  const admin = createAdminClient();
  let removed = 0;

  for (const bucket of ["operator-documents", "boat-images"]) {
    const files = await listStorageFiles(bucket);
    for (let index = 0; index < files.length; index += 100) {
      const batch = files.slice(index, index + 100);
      if (batch.length === 0) continue;
      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) throw new Error(`Unable to clean ${bucket}: ${error.message}`);
      removed += batch.length;
    }
  }

  revalidatePath("/admin/operators");
  redirect(`/admin/operators?storageCleared=${removed}`);
}
