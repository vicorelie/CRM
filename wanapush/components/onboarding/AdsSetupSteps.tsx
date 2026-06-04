"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { useLocalized } from "@/lib/onboarding/helpers";
import type {
  CheckpointStepConfig,
  ConnectStepConfig,
  PlatformWizardConfig,
  SuccessStepConfig,
  WelcomeStepConfig,
} from "@/lib/onboarding/types";
import {
  ExternalLink,
  HowToList,
  InfoCard,
  MD,
  NavFooter,
  StepShell,
  YesNoChoice,
} from "@/components/ui/Wizard";

type NavProps = { onNext: () => void; onBack?: () => void };

/* ─── Welcome ───────────────────────────────────────────────────────────── */
export function WelcomeStep({
  cfg,
  icon,
  onNext,
}: { cfg: WelcomeStepConfig; icon: string } & NavProps) {
  const L = useLocalized();
  return (
    <StepShell
      icon={icon}
      title={L(cfg.title)}
      subtitle={L(cfg.subtitle)}
      footer={<NavFooter onNext={onNext} nextLabel={L(cfg.startLabel)} />}
    >
      <p className="leading-relaxed text-zinc-700">
        <MD>{L(cfg.intro)}</MD>
      </p>
      <InfoCard
        title={cfg.prerequisites.length ? "📋" : ""}
        variant="tip"
      >
        <ul className="space-y-2 list-disc list-inside marker:text-brand-500">
          {cfg.prerequisites.map((p, i) => (
            <li key={i}>{L(p)}</li>
          ))}
        </ul>
      </InfoCard>
      <div className="flex items-center gap-2 text-sm text-amber-700">
        <span>⏱</span>
        <span>{L(cfg.timeWarn)}</span>
      </div>
    </StepShell>
  );
}

/* ─── Checkpoint ────────────────────────────────────────────────────────── */
export function CheckpointStep({
  cfg,
  onNext,
  onBack,
}: { cfg: CheckpointStepConfig } & NavProps) {
  const { t } = useT();
  const L = useLocalized();
  const [mode, setMode] = useState<"ask" | "tutorial">("ask");

  return (
    <StepShell
      icon={cfg.icon}
      title={L(cfg.title)}
      subtitle={L(cfg.subtitle)}
      footer={
        mode === "tutorial" ? (
          <NavFooter
            onBack={() => setMode("ask")}
            onNext={onNext}
            nextLabel={t("common.done")}
          />
        ) : (
          <NavFooter onBack={onBack} />
        )
      }
    >
      <InfoCard title={L(cfg.whatTitle)}>
        <MD>{L(cfg.whatDesc)}</MD>
      </InfoCard>

      {mode === "ask" && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-zinc-900">
            {L(cfg.question)}
          </h3>
          <YesNoChoice
            yesLabel={L(cfg.haveItLabel)}
            noLabel={L(cfg.createItLabel)}
            onYes={onNext}
            onNo={() => setMode("tutorial")}
          />
        </div>
      )}

      {mode === "tutorial" && (
        <div className="space-y-5">
          <h3 className="text-base font-semibold text-zinc-900">
            {L(cfg.howToTitle)}
          </h3>
          <HowToList steps={cfg.howToSteps.map((s) => L(s))} />
          <div className="flex flex-wrap items-center gap-3">
            <ExternalLink href={cfg.externalUrl}>
              {L(cfg.openLinkLabel)}
            </ExternalLink>
          </div>
          <InfoCard title="💡" variant={cfg.tipVariant ?? "tip"}>
            <MD>{L(cfg.tip)}</MD>
          </InfoCard>
        </div>
      )}
    </StepShell>
  );
}

/* ─── Connect (OAuth) ───────────────────────────────────────────────────── */
export function ConnectStep({
  cfg,
  platform,
  oauthStartUrl,
  oauthButtonBg,
  oauthButtonGlyph,
  slug,
  kind,
  onBack,
}: {
  cfg: ConnectStepConfig;
  platform: string;
  oauthStartUrl: string;
  oauthButtonBg: string;
  oauthButtonGlyph: string;
  slug: string;
  kind: "ads" | "social";
} & Pick<NavProps, "onBack">) {
  const L = useLocalized();

  function start() {
    const returnTo = `/${kind === "ads" ? "ads" : "social"}/setup/${slug}?postOauth=1`;
    window.location.href = `${oauthStartUrl}?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <StepShell
      icon="🔐"
      title={L(cfg.title)}
      subtitle={L(cfg.subtitle)}
      footer={<NavFooter onBack={onBack} />}
    >
      <p className="text-zinc-700">
        <MD>{L(cfg.intro)}</MD>
      </p>

      <InfoCard title={L(cfg.permissionsTitle)}>
        <ul className="list-inside list-disc space-y-2 marker:text-brand-500">
          {cfg.permissions.map((p, i) => (
            <li key={i}>{L(p)}</li>
          ))}
        </ul>
      </InfoCard>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {L(cfg.security)}
      </div>

      {cfg.flowTip && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="mb-2 font-semibold">💡 {L(cfg.flowTip.title)}</div>
          <ol className="list-inside list-decimal space-y-1 marker:text-amber-700">
            {cfg.flowTip.steps.map((s, i) => (
              <li key={i}>
                <MD>{L(s)}</MD>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          onClick={start}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lift ${oauthButtonBg}`}
          data-platform={platform}
        >
          <span className="text-xl">{oauthButtonGlyph}</span>
          {L(cfg.actionLabel)}
        </button>
      </div>

      {cfg.noPageHint && (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>📄</span>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-zinc-900">
                {L(cfg.noPageHint.title)}
              </h4>
              <p className="text-sm leading-relaxed text-zinc-600">
                {L(cfg.noPageHint.body)}
              </p>
              <a
                href={cfg.noPageHint.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
              >
                {L(cfg.noPageHint.ctaLabel)} <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">{L(cfg.cancelHint)}</p>
    </StepShell>
  );
}

/* ─── Select accounts ───────────────────────────────────────────────────── */
// L'API /api/ads/accounts et /api/social/accounts retournent des shapes différents.
// On accepte les deux et on normalise via des fallbacks.
type ConnectedAccount = {
  id: string;
  platform: string;
  // Champs côté Ads
  externalId?: string;
  name?: string | null;
  currency?: string | null;
  // Champs côté Social
  accountId?: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function accountPrimary(a: ConnectedAccount, fallback: string): string {
  return a.displayName || a.name || a.username || fallback;
}

function accountSecondary(a: ConnectedAccount): string {
  const id = a.accountId ?? a.externalId ?? "";
  const parts: string[] = [];
  if (a.username && a.displayName) parts.push(`@${a.username}`);
  parts.push(id);
  if (a.currency) parts.push(a.currency);
  return parts.filter(Boolean).join(" · ");
}

export function SelectAccountStep({
  platform,
  accountsApiPath,
  oauthStartUrl,
  slug,
  kind,
  onNext,
  onBack,
}: {
  platform: string;
  accountsApiPath: string;
  oauthStartUrl: string;
  slug: string;
  kind: "ads" | "social";
} & NavProps) {
  const { t } = useT();
  const [accounts, setAccounts] = useState<ConnectedAccount[] | null>(null);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(accountsApiPath)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = (j.accounts ?? []).filter(
          (a: ConnectedAccount) => a.platform === platform,
        );
        setAccounts(list);
        setKeep(new Set(list.map((a: ConnectedAccount) => a.id)));
      });
    return () => {
      cancelled = true;
    };
  }, [platform, accountsApiPath]);

  function toggle(id: string) {
    setKeep((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (!accounts) return;
    setBusy(true);
    const toRemove = accounts.filter((a) => !keep.has(a.id));
    for (const a of toRemove) {
      await fetch(`${accountsApiPath}/${a.id}`, { method: "DELETE" });
    }
    setBusy(false);
    onNext();
  }

  if (accounts === null) {
    return (
      <StepShell icon="⏳" title={t("selectAccount.title")}>
        <p className="text-zinc-500">{t("selectAccount.loading")}</p>
      </StepShell>
    );
  }

  if (accounts.length === 0) {
    const reconnect = () => {
      const returnTo = `/${kind === "ads" ? "ads" : "social"}/setup/${slug}?postOauth=1`;
      window.location.href = `${oauthStartUrl}?returnTo=${encodeURIComponent(returnTo)}`;
    };
    return (
      <StepShell
        icon="⚠️"
        title={t("selectAccount.title")}
        subtitle={t("selectAccount.subtitle")}
        footer={<NavFooter onBack={onBack} />}
      >
        <InfoCard title="" variant="warn">
          {t("selectAccount.empty")}
        </InfoCard>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reconnect}
            className="flex-1 rounded-xl bg-brand-500 px-5 py-3 text-center font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
          >
            ↻ Reconnecter
          </button>
        </div>
      </StepShell>
    );
  }

  const allSelected = accounts.every((a) => keep.has(a.id));

  async function cancel() {
    if (!accounts) return;
    if (
      !window.confirm(
        "Annuler et déconnecter tous les comptes qui viennent d'être autorisés ?",
      )
    )
      return;
    setBusy(true);
    // Supprime tous les comptes qui viennent d'être créés par l'OAuth (ceux affichés ici)
    for (const a of accounts) {
      await fetch(`${accountsApiPath}/${a.id}`, { method: "DELETE" });
    }
    setBusy(false);
    // Reset wizard et retour
    if (typeof window !== "undefined") {
      const slug = window.location.pathname.split("/").pop() ?? "";
      localStorage.removeItem(`wp:wizard:${slug}:step`);
      window.location.href = window.location.pathname.replace(/\/setup\/.+$/, "");
    }
  }

  return (
    <StepShell
      icon="🎯"
      title={t("selectAccount.title")}
      subtitle={t("selectAccount.subtitle")}
      footer={
        <NavFooter
          onBack={cancel}
          backLabel="Annuler"
          onNext={confirm}
          nextLabel={busy ? "…" : t("selectAccount.confirm")}
          nextDisabled={busy || keep.size === 0}
        />
      }
    >
      <p className="text-zinc-700">{t("selectAccount.intro")}</p>

      <div className="flex justify-end">
        <button
          onClick={() =>
            setKeep(allSelected ? new Set() : new Set(accounts.map((a) => a.id)))
          }
          className="text-xs text-brand-700 underline hover:text-brand-800"
        >
          {allSelected
            ? t("selectAccount.deselectAll")
            : t("selectAccount.selectAll")}
        </button>
      </div>

      <ul className="space-y-2">
        {accounts.map((a) => {
          const isKept = keep.has(a.id);
          const primary = accountPrimary(a, t("selectAccount.unnamed"));
          const secondary = accountSecondary(a);
          return (
            <li key={a.id}>
              <button
                onClick={() => toggle(a.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  isKept
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 text-white ${
                    isKept
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-300"
                  }`}
                >
                  {isKept ? "✓" : ""}
                </span>
                {a.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.avatarUrl}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
                  />
                ) : (
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-base text-zinc-400">
                    👤
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-900 truncate">
                    {primary}
                  </div>
                  {secondary && (
                    <div className="font-mono text-xs text-zinc-500 truncate">
                      {secondary}
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </StepShell>
  );
}

/* ─── Success ───────────────────────────────────────────────────────────── */
export function SuccessStep({
  cfg,
  primaryHref,
  secondaryHref,
  kind,
}: {
  cfg: SuccessStepConfig;
  primaryHref: string;
  secondaryHref: string;
  kind: "ads" | "social";
}) {
  const L = useLocalized();
  const connectAnotherHref = kind === "ads" ? "/ads/setup" : "/social/setup";
  const connectAnotherLabel = {
    fr: kind === "ads" ? "+ Connecter un autre compte pub" : "+ Connecter un autre réseau",
    en: kind === "ads" ? "+ Connect another ad account" : "+ Connect another network",
  };
  return (
    <StepShell title={L(cfg.title)} subtitle={L(cfg.subtitle)}>
      <p className="leading-relaxed text-zinc-700">
        <MD>{L(cfg.intro)}</MD>
      </p>

      <InfoCard title={L(cfg.nextStepsTitle)} variant="tip">
        <ul className="list-inside list-disc space-y-2 marker:text-brand-500">
          {cfg.nextSteps.map((s, i) => (
            <li key={i}>{L(s)}</li>
          ))}
        </ul>
      </InfoCard>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <a
          href={primaryHref}
          className="flex-1 rounded-xl bg-brand-500 px-5 py-3 text-center font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
        >
          {L(cfg.createCampaignLabel)} →
        </a>
        <a
          href={secondaryHref}
          className="flex-1 rounded-xl border border-zinc-200 px-5 py-3 text-center font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
        >
          {L(cfg.backLabel)}
        </a>
      </div>

      <a
        href={connectAnotherHref}
        className="block rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/30 px-5 py-3 text-center font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
      >
        {L(connectAnotherLabel)}
      </a>
    </StepShell>
  );
}

/* ─── Generic platform wizard ───────────────────────────────────────────── */
export function PlatformWizardStep({
  cfg,
  stepIndex,
  onNext,
  onBack,
}: {
  cfg: PlatformWizardConfig;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const totalCheckpoints = cfg.checkpoints.length;
  // Step layout: 0=welcome, 1..N=checkpoints, N+1=connect, N+2=select, N+3=success
  if (stepIndex === 0) {
    return <WelcomeStep cfg={cfg.welcome} icon={cfg.icon} onNext={onNext} />;
  }
  if (stepIndex >= 1 && stepIndex <= totalCheckpoints) {
    return (
      <CheckpointStep
        cfg={cfg.checkpoints[stepIndex - 1]}
        onNext={onNext}
        onBack={onBack}
      />
    );
  }
  if (stepIndex === totalCheckpoints + 1) {
    return (
      <ConnectStep
        cfg={cfg.connect}
        platform={cfg.platform}
        oauthStartUrl={cfg.oauthStartUrl}
        oauthButtonBg={cfg.oauthButtonBg}
        oauthButtonGlyph={cfg.oauthButtonGlyph}
        slug={cfg.slug}
        kind={cfg.kind}
        onBack={onBack}
      />
    );
  }
  if (stepIndex === totalCheckpoints + 2) {
    return (
      <SelectAccountStep
        platform={cfg.platform}
        accountsApiPath={cfg.accountsApiPath}
        oauthStartUrl={cfg.oauthStartUrl}
        slug={cfg.slug}
        kind={cfg.kind}
        onNext={onNext}
        onBack={onBack}
      />
    );
  }
  if (stepIndex === totalCheckpoints + 3) {
    return (
      <SuccessStep
        cfg={cfg.success}
        primaryHref={cfg.successPrimaryCtaHref}
        secondaryHref={cfg.successSecondaryCtaHref}
        kind={cfg.kind}
      />
    );
  }
  return null;
}
