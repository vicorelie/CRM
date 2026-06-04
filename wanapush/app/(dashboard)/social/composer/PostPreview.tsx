"use client";

import { useState } from "react";
import type { Account, Media, Platform } from "./types";
import { PLATFORM_EMOJI, PLATFORM_LABEL } from "./types";

type Props = {
  caption: string;
  title: string;
  media: Media[];
  hashtags: string[];
  accounts: Account[];
  selectedIds: string[];
};

export function PostPreview({
  caption,
  title,
  media,
  hashtags,
  accounts,
  selectedIds,
}: Props) {
  const platforms = Array.from(
    new Set(
      accounts
        .filter((a) => selectedIds.includes(a.id))
        .map((a) => a.platform),
    ),
  );

  const [active, setActive] = useState<Platform | null>(platforms[0] ?? null);
  const tab = active ?? platforms[0] ?? null;

  const account = accounts.find((a) => selectedIds.includes(a.id) && a.platform === tab);
  const fullText = `${caption}${hashtags.length ? "\n\n" + hashtags.join(" ") : ""}`;

  if (platforms.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
        Sélectionne au moins un compte pour voir l'aperçu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto">
        {platforms.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActive(p)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === p
                ? "border-brand text-brand-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {PLATFORM_EMOJI[p]} {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white text-zinc-900 overflow-hidden shadow-2xl max-w-md mx-auto">
        {tab === "FACEBOOK" && (
          <FacebookPreview account={account} text={fullText} media={media} />
        )}
        {tab === "INSTAGRAM" && (
          <InstagramPreview account={account} text={fullText} media={media} />
        )}
        {tab === "LINKEDIN" && (
          <LinkedInPreview account={account} text={fullText} media={media} />
        )}
        {tab === "YOUTUBE" && (
          <YouTubePreview account={account} title={title} text={caption} media={media} />
        )}
        {tab === "TIKTOK" && (
          <TikTokPreview account={account} text={fullText} media={media} />
        )}
      </div>
    </div>
  );
}

function MediaSquare({ media }: { media: Media[] }) {
  if (media.length === 0)
    return (
      <div className="aspect-square bg-zinc-100 flex items-center justify-center text-zinc-500 text-xs">
        Aucun média
      </div>
    );
  const m = media[0];
  if (m.type === "video")
    return (
      <div className="aspect-square bg-black flex items-center justify-center text-white">
        <div className="text-4xl">▶</div>
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={m.url} alt="" className="w-full aspect-square object-cover" />;
}

function MediaWide({ media }: { media: Media[] }) {
  if (media.length === 0) return null;
  const m = media[0];
  if (m.type === "video")
    return (
      <div className="aspect-video bg-black flex items-center justify-center text-white">
        <div className="text-4xl">▶</div>
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={m.url} alt="" className="w-full aspect-video object-cover" />;
}

function Avatar({ account }: { account?: Account }) {
  if (account?.avatarUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={account.avatarUrl}
        alt=""
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  return (
    <div className="w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-400">
      ?
    </div>
  );
}

function FacebookPreview({
  account,
  text,
  media,
}: {
  account?: Account;
  text: string;
  media: Media[];
}) {
  return (
    <>
      <div className="flex items-center gap-2 p-3">
        <Avatar account={account} />
        <div>
          <div className="text-sm font-semibold">
            {account?.displayName ?? "Page Facebook"}
          </div>
          <div className="text-[11px] text-zinc-400">À l'instant · 🌐</div>
        </div>
      </div>
      {text && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{text}</p>}
      <MediaWide media={media} />
      <div className="border-t flex justify-around text-zinc-400 text-xs py-2">
        <span>👍 J'aime</span>
        <span>💬 Commenter</span>
        <span>↗ Partager</span>
      </div>
    </>
  );
}

function InstagramPreview({
  account,
  text,
  media,
}: {
  account?: Account;
  text: string;
  media: Media[];
}) {
  return (
    <>
      <div className="flex items-center gap-2 p-3">
        <Avatar account={account} />
        <div className="text-sm font-semibold">{account?.username ?? "compte"}</div>
        <div className="ml-auto text-zinc-500">⋯</div>
      </div>
      <MediaSquare media={media} />
      <div className="px-3 py-2 flex gap-3 text-2xl">
        <span>♡</span>
        <span>💬</span>
        <span>↗</span>
        <span className="ml-auto">⊕</span>
      </div>
      {text && (
        <p className="px-3 pb-3 text-sm">
          <span className="font-semibold mr-1">{account?.username ?? "compte"}</span>
          <span className="whitespace-pre-wrap">{text}</span>
        </p>
      )}
    </>
  );
}

function LinkedInPreview({
  account,
  text,
  media,
}: {
  account?: Account;
  text: string;
  media: Media[];
}) {
  return (
    <>
      <div className="flex items-center gap-2 p-3">
        <Avatar account={account} />
        <div>
          <div className="text-sm font-semibold">
            {account?.displayName ?? "Profil LinkedIn"}
          </div>
          <div className="text-[11px] text-zinc-400">Maintenant · 🌐</div>
        </div>
      </div>
      {text && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{text}</p>}
      <MediaWide media={media} />
      <div className="border-t flex justify-around text-zinc-400 text-xs py-2">
        <span>👍 J'aime</span>
        <span>💬 Commenter</span>
        <span>🔁 Republier</span>
        <span>↗ Envoyer</span>
      </div>
    </>
  );
}

function YouTubePreview({
  account,
  title,
  text,
  media,
}: {
  account?: Account;
  title: string;
  text: string;
  media: Media[];
}) {
  const videoMedia = media.filter((m) => m.type === "video");
  return (
    <>
      <MediaWide media={videoMedia.length > 0 ? videoMedia : media} />
      <div className="p-3 space-y-2">
        <h3 className="text-base font-semibold leading-tight line-clamp-2">
          {title || "Titre de la vidéo (à remplir dans 'Titre YouTube')"}
        </h3>
        <div className="flex items-center gap-2">
          <Avatar account={account} />
          <div>
            <div className="text-sm font-semibold">
              {account?.displayName ?? "Chaîne YouTube"}
            </div>
            <div className="text-[11px] text-zinc-400">0 vues · à l'instant</div>
          </div>
        </div>
        {text && (
          <p className="text-xs text-zinc-700 whitespace-pre-wrap line-clamp-3 pt-1 border-t">
            {text}
          </p>
        )}
      </div>
    </>
  );
}

function TikTokPreview({
  account,
  text,
  media,
}: {
  account?: Account;
  text: string;
  media: Media[];
}) {
  const m = media.find((x) => x.type === "video") ?? media[0];
  return (
    <div className="bg-black text-white relative" style={{ aspectRatio: "9/16" }}>
      {m?.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.url} alt="" className="w-full h-full object-cover" />
      ) : m?.type === "video" ? (
        <div className="w-full h-full flex items-center justify-center text-5xl">▶</div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
          Vidéo TikTok
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-sm font-semibold">@{account?.username ?? "compte"}</div>
        <p className="text-xs whitespace-pre-wrap line-clamp-3">{text}</p>
      </div>
    </div>
  );
}
