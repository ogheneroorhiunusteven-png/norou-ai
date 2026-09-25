"use client";

import { tapFeedback } from "@/lib/haptics";

export type Tab = "dashboard" | "health" | "nutrition" | "schedule" | "more";

const items: { key: Tab; icon: string; label: string }[] = [
  { key: "dashboard", icon: "🏠", label: "Home" },
  { key: "health", icon: "❤️", label: "Health" },
  { key: "nutrition", icon: "🍎", label: "Nutrition" },
  { key: "schedule", icon: "📅", label: "Schedule" },
  { key: "more", icon: "☰", label: "More" },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md sm:left-1/2 sm:-translate-x-1/2 sm:max-w-2xl sm:rounded-t-2xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => {
                void tapFeedback();
                onChange(it.key);
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
                isActive ? "text-[#a855f7]" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span className={`text-xl ${isActive ? "scale-110" : ""} transition-transform`}>{it.icon}</span>
              <span className="text-[10px] font-semibold">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
