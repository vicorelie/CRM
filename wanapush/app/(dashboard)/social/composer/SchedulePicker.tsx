"use client";

type Props = {
  value: string; // datetime-local format YYYY-MM-DDTHH:mm
  onChange: (v: string) => void;
};

function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulePicker({ value, onChange }: Props) {
  function preset(label: string) {
    const now = new Date();
    let d = new Date(now);
    if (label === "now") d = now;
    else if (label === "in1h") d.setHours(now.getHours() + 1, 0, 0, 0);
    else if (label === "tomorrow9") {
      d.setDate(now.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (label === "monday9") {
      const dow = now.getDay();
      const daysToMon = (8 - dow) % 7 || 7;
      d.setDate(now.getDate() + daysToMon);
      d.setHours(9, 0, 0, 0);
    }
    onChange(fmt(d));
  }

  const selected = value ? new Date(value) : null;
  const isPast = selected ? selected.getTime() < Date.now() - 60_000 : false;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700">
        📅 Date & heure de publication
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => preset("now")}
          className="text-xs rounded-full border border-zinc-200 hover:border-brand bg-white px-3 py-1"
        >
          Maintenant
        </button>
        <button
          type="button"
          onClick={() => preset("in1h")}
          className="text-xs rounded-full border border-zinc-200 hover:border-brand bg-white px-3 py-1"
        >
          Dans 1h
        </button>
        <button
          type="button"
          onClick={() => preset("tomorrow9")}
          className="text-xs rounded-full border border-zinc-200 hover:border-brand bg-white px-3 py-1"
        >
          Demain 9h
        </button>
        <button
          type="button"
          onClick={() => preset("monday9")}
          className="text-xs rounded-full border border-zinc-200 hover:border-brand bg-white px-3 py-1"
        >
          Lundi prochain 9h
        </button>
      </div>

      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />

      {selected && (
        <p className={`text-xs ${isPast ? "text-amber-800" : "text-zinc-500"}`}>
          {isPast
            ? "⏱ Date dans le passé — le post sera publié immédiatement par le cron."
            : `Publication prévue : ${selected.toLocaleString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`}
        </p>
      )}
    </div>
  );
}
