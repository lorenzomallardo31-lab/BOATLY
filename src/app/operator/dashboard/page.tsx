import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams: Promise<{ operator?: string }>;
};

export default async function OperatorDashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams;
  const suffix = query.operator
    ? `?operator=${encodeURIComponent(query.operator)}`
    : "";
  redirect(`/operator/calendar${suffix}`);
}
