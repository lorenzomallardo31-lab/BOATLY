"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import type { MarketplaceBoat } from "@/lib/marketplace/types";

type SearchMapProps = {
  boats: MarketplaceBoat[];
  token: string | null;
};

type MapboxInstance = {
  remove: () => void;
  addControl: (control: unknown, position?: string) => void;
  fitBounds: (
    bounds: unknown,
    options?: { padding?: number; maxZoom?: number },
  ) => void;
};

type MapboxApi = {
  accessToken: string;
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    attributionControl: boolean;
  }) => MapboxInstance;
  NavigationControl: new (options?: { showCompass?: boolean }) => unknown;
  LngLatBounds: new () => {
    extend: (point: [number, number]) => void;
  };
  Popup: new (options?: { offset?: number }) => {
    setDOMContent: (node: Node) => unknown;
  };
  Marker: new (options: { element: HTMLElement }) => {
    setLngLat: (point: [number, number]) => {
      setPopup: (popup: unknown) => {
        addTo: (map: MapboxInstance) => unknown;
      };
    };
  };
};

declare global {
  interface Window {
    mapboxgl?: MapboxApi;
  }
}

export default function SearchMap({ boats, token }: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const points = boats.filter(
    (boat) =>
      typeof boat.longitude === "number" && typeof boat.latitude === "number",
  );

  useEffect(() => {
    const api = window.mapboxgl;

    if (!token || !scriptReady || !containerRef.current || !api || mapRef.current) {
      return;
    }

    api.accessToken = token;

    const first = points[0];
    const map = new api.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: first ? [first.longitude!, first.latitude!] : [14.2681, 40.8518],
      zoom: first ? 9 : 8,
      attributionControl: true,
    });

    map.addControl(new api.NavigationControl({ showCompass: false }), "top-right");

    const bounds = new api.LngLatBounds();

    for (const boat of points) {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.style.border = "2px solid white";
      markerElement.style.borderRadius = "999px";
      markerElement.style.background = "#0B1F33";
      markerElement.style.color = "white";
      markerElement.style.padding = "8px 10px";
      markerElement.style.fontSize = "12px";
      markerElement.style.fontWeight = "700";
      markerElement.style.boxShadow = "0 4px 16px rgba(11,31,51,.25)";
      markerElement.textContent = boat.from_price_cents
        ? `€${Math.round(boat.from_price_cents / 100)}`
        : "Boatly";

      const popup = new api.Popup({ offset: 18 });
      const popupContent = document.createElement("div");
      const popupTitle = document.createElement("strong");
      const popupCity = document.createElement("span");
      popupTitle.textContent = boat.name;
      popupCity.textContent = boat.city ?? "";
      popupContent.append(popupTitle, document.createElement("br"), popupCity);
      popup.setDOMContent(popupContent);

      new api.Marker({ element: markerElement })
        .setLngLat([boat.longitude!, boat.latitude!])
        .setPopup(popup)
        .addTo(map);

      bounds.extend([boat.longitude!, boat.latitude!]);
    }

    if (points.length > 1) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 11 });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, scriptReady, token]);

  if (!token) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-[#DEE5E8] bg-[radial-gradient(circle_at_top,#DFF5F0,#EEF5F7_45%,#F7F9F8)] p-8 text-center">
        <p className="text-sm font-semibold text-[#14B8A6]">Mappa Boatly</p>
        <h3 className="mt-2 text-xl font-semibold">Mapbox pronto al collegamento</h3>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#64748B]">
          La ricerca funziona già in modalità lista. La mappa interattiva si
          attiva appena viene configurata la chiave pubblica Mapbox.
        </p>
      </div>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css"
      />
      <Script
        src="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className="min-h-[520px] overflow-hidden rounded-3xl border border-[#DEE5E8] bg-[#EAF2F2]"
      />
    </>
  );
}
