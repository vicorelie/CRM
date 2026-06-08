import Link from "next/link";

type Props = {
  title: string;
  emoji: string;
  description: string;
  roadmap: string[];
};

export async function ModulePage({ title, emoji, description, roadmap }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/cockpit"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-brand-700"
      >
        <span aria-hidden>←</span> Retour au cockpit
      </Link>

      <section className="mt-8 space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-3xl">
          {emoji}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-pretty text-base text-zinc-600">
          {description}
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-surface p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            <span className="size-1.5 rounded-full bg-amber-500" />
            En développement
          </span>
          <span className="text-xs text-zinc-500">
            Module pas encore branché aux APIs
          </span>
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Roadmap
        </h2>
        <ol className="mt-4 space-y-3">
          {roadmap.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-4 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-zinc-700">{item}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
