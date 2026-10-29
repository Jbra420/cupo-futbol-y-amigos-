import { describe, expect, it, vi, afterEach } from "vitest";
import { googleMapsEmbedUrl, googleMapsUrl } from "@/lib/maps";
vi.mock("server-only", () => ({}));
import { resolveMapsLocation } from "@/lib/resolve-maps";

const point = "https://www.google.com/maps?q=-2.900128,-79.005896";

afterEach(() => vi.unstubAllGlobals());

describe("ubicación de Google Maps", () => {
  it("admite enlaces compartidos y rechaza otros hosts, protocolos y credenciales", () => {
    for (const value of [
      point,
      "https://maps.app.goo.gl/AbCd123",
      "https://goo.gl/maps/AbCd123",
      "https://maps.google.com/?q=Cuenca",
      "https://www.google.com.ec/maps/search/-2.895205,+-79.000747",
    ])
      expect(googleMapsUrl(value)).not.toBeNull();
    for (const value of [
      "http://www.google.com/maps?q=x",
      "javascript:alert(1)",
      "https://www.google.com.evil.test/maps?q=x",
      "https://evil.test/?q=google.com/maps",
      "https://user@www.google.com/maps?q=x",
      "https://www.google.com:8080/maps?q=x",
      "https://www.google.com/url?q=https://evil.test",
      "https://maps.app.goo.gl/extra/path",
      "https://www.google.com/maps" + "x".repeat(4096),
    ])
      expect(googleMapsUrl(value)).toBeNull();
  });

  it("muestra el punto del lugar en vez de la posición de la cámara", () => {
    const embed = googleMapsEmbedUrl(
      "https://www.google.com/maps/place/Cancha/@-2.8,-79.1,12z/data=!4m2!3d-2.900128!4d-79.005896",
    );
    expect(new URL(embed!).searchParams.get("q")).toBe("-2.900128,-79.005896");
  });

  it("admite búsquedas, coordenadas, place ID y mapas insertados por Google", () => {
    expect(new URL(googleMapsEmbedUrl(point)!).searchParams.get("q")).toBe(
      "-2.900128,-79.005896",
    );
    const search =
      "https://www.google.com/maps/search/?api=1&query=Cancha%20%26%20amigos";
    expect(new URL(googleMapsEmbedUrl(search)!).searchParams.get("q")).toBe(
      "Cancha & amigos",
    );
    expect(
      new URL(
        googleMapsEmbedUrl("https://www.google.com/maps?cid=123456")!,
      ).searchParams.get("cid"),
    ).toBe("123456");
    const embed = "https://www.google.com/maps/embed?pb=!1m2!1d1!2d2";
    expect(googleMapsEmbedUrl(embed)).toBe(embed);
    expect(
      googleMapsEmbedUrl("https://www.google.com/maps/place/%E0%A4%A"),
    ).toBeNull();
    expect(googleMapsEmbedUrl(null)).toBeNull();
  });

  it("no solicita la red para enlaces completos ni para quitar un mapa", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await resolveMapsLocation(point)).toBe(point);
    expect(await resolveMapsLocation(" ")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("resuelve un enlace corto antes de guardar y limita los saltos a Google Maps", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: point } }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await resolveMapsLocation("https://maps.app.goo.gl/AbCd123")).toBe(
      point,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
  });

  it("no sigue redirecciones externas ni direcciones internas", async () => {
    for (const location of [
      "http://127.0.0.1:54321",
      "https://evil.test/maps",
      "https://www.google.com/url?next=http://localhost",
    ]) {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 302, headers: { location } }),
        );
      vi.stubGlobal("fetch", fetcher);
      await expect(
        resolveMapsLocation("https://maps.app.goo.gl/AbCd123"),
      ).rejects.toThrow("No encontramos el punto");
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });

  it("normaliza los enlaces compartidos desde Ecuador sin perder las coordenadas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: {
            location:
              "https://www.google.com.ec/maps/search/-2.895205,+-79.000747?entry=tts",
          },
        }),
      ),
    );
    const resolved = await resolveMapsLocation(
      "https://maps.app.goo.gl/AbCd123",
    );
    expect(new URL(resolved!).hostname).toBe("www.google.com");
    expect(new URL(googleMapsEmbedUrl(resolved)!).searchParams.get("q")).toBe(
      "-2.895205, -79.000747",
    );
  });

  it("termina ante bucles y comunica fallos de red sin guardar un punto incorrecto", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://maps.app.goo.gl/AbCd123" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resolveMapsLocation("https://maps.app.goo.gl/AbCd123"),
    ).rejects.toThrow("No encontramos el punto");
    expect(fetcher).toHaveBeenCalledTimes(5);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(
      resolveMapsLocation("https://maps.app.goo.gl/AbCd123"),
    ).rejects.toThrow("No pudimos cargar");
  });
});
