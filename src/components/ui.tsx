"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Card({
  children,
  className = "",
  id,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`rounded-2xl bg-[#2a2a2a] border border-white/5 ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-[#a855f7] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100";
  const variants: Record<string, string> = {
    primary: "bg-[#a855f7] text-white hover:bg-[#9333ea]",
    ghost: "bg-white/5 text-white hover:bg-white/10 border border-white/10",
    subtle: "bg-transparent text-neutral-300 hover:text-white hover:bg-white/5",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  // Guards the createPortal call below: document only exists client-side,
  // and Next's static export prerenders this component on the server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Rendered via a portal straight to <body>, deliberately OUTSIDE
  // .app-scroll. iOS WebKit has a long-standing bug where a `position:
  // fixed` element nested inside an ancestor using
  // `-webkit-overflow-scrolling: touch` (which .app-scroll needs for
  // smooth momentum scrolling) doesn't actually anchor to the real
  // viewport — it gets visually clipped to that ancestor's bounds
  // instead. That's what caused the modal to render squeezed into the
  // content area with the bottom nav bar showing through below it,
  // instead of covering the full screen. Portaling to body sidesteps
  // the bug entirely rather than working around its symptoms.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md modal-sheet-height overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1a1a1a] border border-white/10 p-5 animate-slideUp"
        style={{ paddingBottom: "calc(1.25rem + var(--keyboard-inset, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-3">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl bg-[#2a2a2a] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#a855f7] transition-colors";

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-neutral-200">{children}</h2>
      {action}
    </div>
  );
}

export function StatBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#c99bf7]">
      {icon} {children}
    </span>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-4xl mb-2 opacity-60">{icon}</div>
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  );
}
