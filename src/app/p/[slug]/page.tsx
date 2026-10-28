import { APP_NAME } from "@/lib/brand";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMatch } from "@/components/public-match";
import { getPublicMatch } from "@/lib/public-match";
import { siteOrigin } from "@/lib/site";
import { spotsLabel } from "@/lib/utils/spots";
import { formatMatchDate } from "@/lib/date";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicMatch(slug);
  if (!data)
    return { title: "Partido no encontrado", robots: { index: false } };
  const remaining = Math.max(
    0,
    data.match.capacity -
      data.registrations.filter((player) => player.status === "confirmed")
        .length,
  );
  const spots =
    data.match.status === "finished"
      ? "Partido finalizado"
      : remaining
        ? spotsLabel(remaining)
        : "Cupos llenos · Lista de espera disponible";
  const title = `${data.match.title} · ${spots}`;
  const description = `${formatMatchDate(data.match.starts_at)} · ${data.match.location}. ${spots}. Organiza el fútbol con tu gente en ${APP_NAME}.`;
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description,
    alternates: { canonical: `/p/${slug}` },
    openGraph: {
      title,
      description,
      url: `/p/${slug}`,
      siteName: APP_NAME,
      locale: "es_EC",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
export default async function PublicMatchPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicMatch(slug);
  if (!data) notFound();
  return <PublicMatch initial={data} />;
}
