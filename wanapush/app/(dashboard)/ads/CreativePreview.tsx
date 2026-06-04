"use client";

import type { AdPlatform } from "./types";

type Copy = Record<string, string | string[]>;

type Props = {
  platform: AdPlatform;
  copy: Copy;
};

export function CreativePreview({ platform, copy }: Props) {
  return (
    <div className="rounded-xl bg-white text-slate-900 overflow-hidden shadow-2xl max-w-md">
      {platform === "META_ADS" && <MetaPreview copy={copy} />}
      {platform === "GOOGLE_ADS" && <GooglePreview copy={copy} />}
      {platform === "TIKTOK_ADS" && <TikTokPreview copy={copy} />}
      {platform === "LINKEDIN_ADS" && <LinkedInPreview copy={copy} />}
    </div>
  );
}

function MetaPreview({ copy }: { copy: Copy }) {
  return (
    <>
      <div className="flex items-center gap-2 p-3">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
          A
        </div>
        <div>
          <div className="text-sm font-semibold">Votre Page</div>
          <div className="text-[11px] text-zinc-400">Sponsorisé · 🌐</div>
        </div>
      </div>
      {copy.primary_text && (
        <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{copy.primary_text}</p>
      )}
      <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center text-zinc-500 text-xs">
        Image / vidéo creative
      </div>
      <div className="p-3 border-t flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase text-zinc-500">monsite.com</div>
          {copy.headline && (
            <div className="text-sm font-semibold text-slate-900 truncate">
              {copy.headline}
            </div>
          )}
          {copy.description && (
            <div className="text-xs text-zinc-300 truncate">{copy.description}</div>
          )}
        </div>
        {copy.cta && (
          <button className="text-xs font-semibold rounded-md bg-slate-200 hover:bg-slate-300 px-3 py-1.5 shrink-0">
            {copy.cta}
          </button>
        )}
      </div>
    </>
  );
}

function GooglePreview({ copy }: { copy: Copy }) {
  const headlines = (Array.isArray(copy.headlines) ? copy.headlines : [copy.headlines]).filter(
    Boolean,
  ) as string[];
  const descriptions = (
    Array.isArray(copy.descriptions) ? copy.descriptions : [copy.descriptions]
  ).filter(Boolean) as string[];
  return (
    <div className="p-4 space-y-1">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="font-semibold text-slate-700">Annonce</span> ·{" "}
        <span>www.monsite.com{copy.display_path ? `/${copy.display_path}` : ""}</span>
      </div>
      <h3 className="text-blue-700 text-lg font-medium leading-tight">
        {headlines.slice(0, 3).join(" | ")}
      </h3>
      <p className="text-sm text-slate-700">{descriptions.slice(0, 2).join(" ")}</p>
    </div>
  );
}

function TikTokPreview({ copy }: { copy: Copy }) {
  return (
    <div className="bg-black text-white relative" style={{ aspectRatio: "9/16" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-black to-cyan-500/10" />
      <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
        Vidéo TikTok
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent space-y-2">
        <div className="text-sm font-semibold">@votreCompte · Sponsorisé</div>
        {copy.hook && <div className="text-base font-bold">{copy.hook}</div>}
        {copy.text && (
          <p className="text-xs whitespace-pre-wrap line-clamp-3">{copy.text}</p>
        )}
        {copy.cta && (
          <button className="rounded-md bg-white text-black text-xs font-semibold px-3 py-1.5">
            {copy.cta}
          </button>
        )}
      </div>
    </div>
  );
}

function LinkedInPreview({ copy }: { copy: Copy }) {
  return (
    <>
      <div className="flex items-center gap-2 p-3">
        <div className="w-10 h-10 rounded bg-sky-700 flex items-center justify-center text-white font-bold">
          A
        </div>
        <div>
          <div className="text-sm font-semibold">Votre Entreprise</div>
          <div className="text-[11px] text-zinc-400">Sponsorisé · 🌐</div>
        </div>
      </div>
      {copy.intro_text && (
        <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{copy.intro_text}</p>
      )}
      <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center text-zinc-500 text-xs">
        Image / vidéo creative
      </div>
      <div className="p-3 border-t flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {copy.headline && (
            <div className="text-sm font-semibold truncate">{copy.headline}</div>
          )}
          <div className="text-[10px] uppercase text-zinc-500">monsite.com</div>
          {copy.description && (
            <div className="text-xs text-zinc-300 line-clamp-2">{copy.description}</div>
          )}
        </div>
        {copy.cta && (
          <button className="text-xs font-semibold rounded-full border border-sky-700 text-sky-700 hover:bg-sky-50 px-3 py-1 shrink-0">
            {copy.cta}
          </button>
        )}
      </div>
    </>
  );
}
