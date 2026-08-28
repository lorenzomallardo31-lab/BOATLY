"use client";

import { type FormEvent, useEffect, useState } from "react";

import type { DemoLocation } from "@/lib/demo/types";

const inputClass = "min-h-12 w-full rounded-xl border border-[#D8D5E5] bg-white px-4 text-base text-[#171A2B] outline-none transition focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/15";

type MapboxContext = {
  id?: string;
  text?: string;
  short_code?: string;
};

type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  center?: [number, number];
  place_type?: string[];
  properties?: { short_code?: string };
  context?: MapboxContext[];
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function contextValue(feature: MapboxFeature, prefix: string) {
  return feature.context?.find((item) => item.id?.startsWith(prefix))?.text ?? "";
}

function featureToLocation(feature: MapboxFeature): DemoLocation | null {
  if (!feature.center || feature.center.length !== 2) return null;
  const [longitude, latitude] = feature.center;
  const city = feature.place_type?.includes("place")
    ? feature.text
    : contextValue(feature, "place") || feature.text;
  const region = contextValue(feature, "region");
  return {
    id: feature.id,
    label: feature.text,
    fullName: feature.place_name,
    city,
    region,
    countryCode: "IT",
    longitude,
    latitude,
  };
}

type DemoWorkspaceSetupProps = {
  token: string;
  onContinue: (name: string, location: DemoLocation) => void;
};

export function DemoWorkspaceSetup({ token, onContinue }: DemoWorkspaceSetupProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DemoLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DemoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (!token || normalized.length < 1 || selectedLocation?.fullName === query) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalized)}.json?access_token=${encodeURIComponent(token)}&autocomplete=true&country=it&language=it&limit=8&types=place,locality,postcode,address`;
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error("geocoding-failed");
        const body = await response.json() as MapboxResponse;
        setSuggestions((body.features ?? []).map(featureToLocation).filter((item): item is DemoLocation => Boolean(item)));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setSearchError("Non è stato possibile caricare i luoghi. Riprova tra poco.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedLocation?.fullName, token]);

  function continueToLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().replace(/\s+/g, " ").length >= 2) setStep(2);
  }

  function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (normalizedName.length >= 2 && selectedLocation) onContinue(normalizedName, selectedLocation);
  }

  function selectLocation(location: DemoLocation) {
    setLoading(false);
    setSelectedLocation(location);
    setQuery(location.fullName);
    setSuggestions([]);
  }

  const mapImage = selectedLocation && token
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+6d5dfb(${selectedLocation.longitude},${selectedLocation.latitude})/${selectedLocation.longitude},${selectedLocation.latitude},11/900x300@2x?access_token=${encodeURIComponent(token)}`
    : null;

  return (
    <main className="min-h-screen bg-[#F4F3FA] px-4 py-8 text-[#171A2B] sm:grid sm:place-items-center sm:px-6 sm:py-12">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#D8D5E5] bg-white shadow-xl lg:grid-cols-[0.82fr_1.18fr]">
        <div className="bg-[#171A2B] p-7 text-white sm:p-10 lg:p-12">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#6D5DFB] font-bold">B</span><div><p className="text-lg font-bold tracking-tight">Boatly Ops</p><p className="text-xs text-white/50">Area noleggiatore</p></div></div>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.14em] text-[#FDBA74]">Configurazione workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Il centro operativo della tua attività.</h1>
          <p className="mt-5 text-sm leading-7 text-white/65">Imposta attività e sede reale. Il workspace conterrà esclusivamente dati sintetici salvati sul tuo dispositivo.</p>
          <div className="mt-8 grid gap-3 text-sm text-white/80"><p>✓ Calendario e prenotazioni collegati</p><p>✓ Flotta e optional modificabili</p><p>✓ Nessun pagamento o cliente reale</p></div>
        </div>

        <div className="p-7 sm:p-10 lg:p-12">
          <div className="flex items-center gap-2" aria-label={`Passaggio ${step} di 2`}><span className="h-2 flex-1 rounded-full bg-[#6D5DFB]" /><span className={`h-2 flex-1 rounded-full ${step === 2 ? "bg-[#6D5DFB]" : "bg-[#E2DFEB]"}`} /></div>

          {step === 1 ? (
            <form onSubmit={continueToLocation} className="mt-8">
              <span className="inline-flex rounded-full bg-[#EDE9FE] px-3 py-1.5 text-xs font-bold text-[#5B4FD6]">Passaggio 1 di 2</span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">Come si chiama la tua attività?</h2>
              <p className="mt-3 text-sm leading-6 text-[#676B80]">Il nome apparirà nell’intestazione e nelle aree operative.</p>
              <label className="mt-7 grid gap-2 text-sm font-semibold"><span>Nome dell’attività</span><input autoFocus required minLength={2} maxLength={80} className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Es. Charter Napoli" autoComplete="organization" /></label>
              <button className="mt-5 min-h-12 w-full rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white disabled:opacity-40" disabled={name.trim().length < 2}>Continua con la sede →</button>
            </form>
          ) : (
            <form onSubmit={finish} className="mt-8">
              <span className="inline-flex rounded-full bg-[#EDE9FE] px-3 py-1.5 text-xs font-bold text-[#5B4FD6]">Passaggio 2 di 2</span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">Dove si trova la tua attività?</h2>
              <p className="mt-3 text-sm leading-6 text-[#676B80]">Scrivi anche una sola lettera e seleziona uno dei luoghi reali suggeriti in Italia.</p>

              {!token ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Ricerca geografica da collegare.</strong><br />Configura la chiave pubblica Mapbox già prevista dal progetto per attivare suggerimenti e mappa reale.</div> : null}

              <div className="relative mt-6">
                <label className="grid gap-2 text-sm font-semibold"><span>Comune, località o indirizzo</span><input autoFocus required disabled={!token} className={inputClass} value={query} onChange={(event) => { setLoading(false); setQuery(event.target.value); setSelectedLocation(null); setSuggestions([]); }} placeholder="Inizia a scrivere, es. P…" autoComplete="off" role="combobox" aria-expanded={suggestions.length > 0} aria-controls="location-suggestions" /></label>
                {loading ? <span className="absolute right-4 top-[42px] text-xs font-semibold text-[#6D5DFB]">Ricerca…</span> : null}
                {suggestions.length > 0 ? <div id="location-suggestions" className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#D8D5E5] bg-white p-2 shadow-xl">{suggestions.map((location) => <button key={location.id} type="button" onClick={() => selectLocation(location)} className="min-h-12 w-full rounded-xl px-3 py-2 text-left hover:bg-[#F1EEFF]"><strong className="block text-sm">{location.label}</strong><span className="mt-0.5 block text-xs text-[#676B80]">{location.fullName}</span></button>)}</div> : null}
              </div>
              {searchError ? <p className="mt-2 text-sm text-rose-700">{searchError}</p> : null}

              {selectedLocation && mapImage ? <div className="mt-5 overflow-hidden rounded-2xl border border-[#D8D5E5]"><div role="img" aria-label={`Mappa di ${selectedLocation.fullName}`} className="h-44 bg-cover bg-center" style={{ backgroundImage: `url("${mapImage}")` }} /><div className="bg-white p-4"><p className="text-sm font-semibold">✓ {selectedLocation.fullName}</p><p className="mt-1 text-xs text-[#676B80]">Coordinate verificate: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}</p></div></div> : null}

              <div className="mt-6 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setStep(1)} className="min-h-12 rounded-xl border border-[#D8D5E5] px-5 text-sm font-semibold">← Indietro</button><button className="min-h-12 rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white disabled:opacity-40" disabled={!selectedLocation}>Apri area noleggiatore →</button></div>
            </form>
          )}

          <p className="mt-5 text-xs leading-5 text-[#676B80]">Il workspace è indipendente dalla piattaforma pubblica e resta salvato soltanto su questo dispositivo.</p>
        </div>
      </section>
    </main>
  );
}
