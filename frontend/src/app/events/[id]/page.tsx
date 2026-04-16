import { redirect } from "next/navigation";
import { DEFAULT_PUBLIC_ORG_SLUG } from "@/lib/default-org-slug";

interface Props {
  params: Promise<{ id: string }>;
}

/** Legacy URL — tenant catalog lives under `/e/{orgSlug}/events/...`. */
export default async function LegacyEventRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/e/${DEFAULT_PUBLIC_ORG_SLUG}/events/${id}`);
}
