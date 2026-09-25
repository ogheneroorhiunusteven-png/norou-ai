"use client";

import type { Activity } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatTimeRange } from "@/lib/date";

export function ActivityRow({
  activity,
  date,
  showActions,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  date: Date;
  showActions?: boolean;
  onEdit?: (a: Activity) => void;
  onDelete?: (a: Activity) => void;
}) {
  const { isCompleted, toggleActivity } = useStore();
  const done = isCompleted(activity.id, date);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#2a2a2a] border border-white/5 px-3.5 py-3">
      <div className={`w-1 self-stretch rounded-full ${activity.xp > 0 ? "bg-[#a855f7]" : "bg-white/15"}`} />
      <button
        onClick={() => toggleActivity(activity.id, date)}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
          done ? "bg-[#a855f7] border-[#a855f7]" : "border-white/25 hover:border-[#a855f7]"
        }`}
      >
        {done && <span className="text-[13px] leading-none text-white">✓</span>}
      </button>
      <span className="text-xl shrink-0">{activity.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${done ? "text-neutral-500 line-through" : "text-white"}`}>
          {activity.title}
        </div>
        <div className="text-[11px] text-neutral-400">{formatTimeRange(activity.start, activity.end)}</div>
      </div>
      {activity.xp > 0 && (
        <span className="shrink-0 rounded-full bg-[#a855f7]/15 px-2 py-0.5 text-[11px] font-bold text-[#c99bf7]">
          +{activity.xp} XP
        </span>
      )}
      {showActions && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit?.(activity)}
            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center"
            aria-label="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete?.(activity)}
            className="h-7 w-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center"
            aria-label="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
