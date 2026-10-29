import { MapPin, ExternalLink } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsUrl } from "@/lib/maps";
import { Button } from "./ui/button";

export function MatchLocation({
  location,
  mapsUrl,
}: {
  location: string;
  mapsUrl?: string | null;
}) {
  const link = mapsUrl ? googleMapsUrl(mapsUrl) : null;
  const embed = googleMapsEmbedUrl(mapsUrl);
  if (!link) return null;
  return (
    <section
      className="card match-location"
      aria-label="Ubicación de la cancha"
    >
      <div className="location-heading">
        <div>
          <h2>
            <MapPin aria-hidden="true" /> ¿Dónde jugamos?
          </h2>
          <p>{location}</p>
        </div>
        <Button variant="outline" asChild>
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" /> Ver en Google Maps
          </a>
        </Button>
      </div>
      {embed && (
        <iframe
          key={embed}
          src={embed}
          title={`Ubicación de ${location} en Google Maps`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </section>
  );
}

export function MapsLinkField({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  return (
    <label className="maps-link-field">
      Enlace de Google Maps <span className="optional">(opcional)</span>
      <input
        name="mapsUrl"
        type="url"
        maxLength={4096}
        defaultValue={defaultValue ?? ""}
        placeholder="https://maps.app.goo.gl/…"
      />
      <small>
        En Google Maps, abre la cancha y elige Compartir → Copiar enlace. Los
        jugadores verán el mapa en el partido.
      </small>
    </label>
  );
}
