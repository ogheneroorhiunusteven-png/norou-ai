"use client";

import { tapFeedback } from "@/lib/haptics";

export type Tab = "dashboard" | "health" | "nutrition" | "schedule" | "money" | "more";

const items: { key: Tab; icon: string; label: string }[] = [
  { key: "dashboard", icon: "⌂", label: "Home" },
  { key: "schedule", icon: "◫", label: "Plan" },
  { key: "health", icon: "⌁", label: "Wellness" },
  { key: "nutrition", icon: "◌", label: "Fuel" },
  { key: "money", icon: "£", label: "Money" },
  { key: "more", icon: "•••", label: "Hub" },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="norou-bottom-nav fixed bottom-0 left-0 right-0 z-40 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-2xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => {
          const isActive = active === it.key;
          return <button key={it.key} onClick={() => { void tapFeedback(); onChange(it.key); }} aria-current={isActive ? "page" : undefined} aria-label={`Open ${it.label}`} className={`norou-nav-item ${isActive ? "active" : ""}`}><span>{it.icon}</span><small>{it.label}</small></button>;
        })}
      </div>
    </nav>
  );
}
