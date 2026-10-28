import { ImageResponse } from "next/og";
import { getPublicMatch } from "@/lib/public-match";
import { spotsLabel } from "@/lib/utils/spots";
import { formatMatchDate } from "@/lib/date";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const alt = "Fútbol y amigos: el partido y sus cupos disponibles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicMatch(slug);
  if (!data) return new Response("Partido no encontrado", { status: 404 });
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
        : "Cupos llenos. Súmate a la espera.";
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#14291d",
        color: "#f5f7ed",
        padding: "62px 70px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>
          Fútbol y amigos<span style={{ color: "#b9e66f" }}>.</span>
        </span>
        <span style={{ color: "#c0d0c0", fontSize: 19 }}>
          FÚTBOL CON TU GENTE
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: data.match.title.length > 55 ? 43 : 58,
            lineHeight: 1.12,
            fontWeight: 700,
          }}
        >
          {data.match.title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#c0d0c0",
            marginTop: 22,
          }}
        >
          {formatMatchDate(data.match.starts_at)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#c0d0c0",
            marginTop: 8,
          }}
        >
          {data.match.location.slice(0, 100)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #436044",
          paddingTop: 25,
        }}
      >
        <span style={{ fontSize: 30, color: "#b9e66f", fontWeight: 700 }}>
          {spots}
        </span>
        <span style={{ fontSize: 18, color: "#c0d0c0" }}>
          {data.match.status === "finished"
            ? "Así quedó el partido"
            : "Abre el enlace y apúntate"}
        </span>
      </div>
    </div>,
    { ...size, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
