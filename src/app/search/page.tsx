import { redirect } from "next/navigation";

type SearchAliasProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchAlias({ searchParams }: SearchAliasProps) {
  const params = await searchParams;
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      next.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        next.append(key, item);
      }
    }
  }

  redirect(`/cerca${next.size ? `?${next.toString()}` : ""}`);
}
