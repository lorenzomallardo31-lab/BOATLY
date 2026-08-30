import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Invito Boatly Ops", robots: { index: false, follow: false } };

export default function TeamInvitePage() {
  redirect("/sign-in?error=team-invites-retired");
}
