"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { Card, ProgressBar, Modal, Field, inputClass, Button, EmptyState } from "../ui";
import { isScannerSupported, ensureScannerPermission, scanBarcode, lookupBarcode } from "@/lib/food-scanner";

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-neutral-300">{label}</span>
        <span className="text-neutral-400">
          {Math.round(value)}g / {goal}g
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, (value / goal) * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

const emptyForm = { name: "", calories: "", protein: "", carbs: "", fat: "" };

export function Nutrition() {
  const { state, getMeals, addMeal, updateMeal, deleteMeal } = useStore();
  const meals = getMeals();
  const goals = state.nutritionGoals;

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [servingNote, setServingNote] = useState<string | null>(null);

  const handleScan = async () => {
    setError("");
    setServingNote(null);
    if (!(await isScannerSupported())) {
      setError("Barcode scanning isn't available on this device.");
      return;
    }
    if (!(await ensureScannerPermission())) {
      setError("Camera permission is needed to scan a barcode.");
      return;
    }
    setScanning(true);
    try {
      const code = await scanBarcode();
      if (!code) return; // user cancelled
      const food = await lookupBarcode(code);
      if (!food) {
        setError("Product not found. You can still enter it manually below.");
        return;
      }
      // Open Food Facts gives values per 100g — prefill as a starting point,
      // the person adjusts for their actual portion before saving.
      setForm({
        name: food.name,
        calories: String(food.calories),
        protein: String(food.protein),
        carbs: String(food.carbs),
        fat: String(food.fat),
      });
      setServingNote(
        food.servingSize
          ? `Per 100g (label serving: ${food.servingSize}) — adjust for your actual portion.`
          : "Per 100g — adjust the numbers below for your actual portion."
      );
    } catch {
      setError("Scan failed or was cancelled.");
    } finally {
      setScanning(false);
    }
  };

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const remaining = Math.max(0, goals.calories - totals.calories);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (m: Meal) => {
    setEditId(m.id);
    setForm({
      name: m.name,
      calories: String(m.calories),
      protein: String(m.protein),
      carbs: String(m.carbs),
      fat: String(m.fat),
    });
    setError("");
    setOpen(true);
  };

  const numOr = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  const save = () => {
    if (!form.name.trim()) {
      setError("Please enter a meal name.");
      return;
    }
    const cal = numOr(form.calories || "0");
    const p = numOr(form.protein || "0");
    const c = numOr(form.carbs || "0");
    const f = numOr(form.fat || "0");
    if ([cal, p, c, f].some((x) => Number.isNaN(x))) {
      setError("Numeric fields must be valid non-negative numbers.");
      return;
    }
    const payload = { name: form.name.trim(), calories: cal, protein: p, carbs: c, fat: f };
    if (editId) updateMeal({ ...payload, id: editId });
    else addMeal(payload);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-white">Nutrition</h1>
          <p className="text-sm text-neutral-400">Today&apos;s intake</p>
        </div>
        <button
          onClick={openAdd}
          className="h-10 w-10 rounded-full bg-[#a855f7] text-white text-xl font-bold flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Add meal"
        >
          +
        </button>
      </header>

      {/* Calories */}
      <Card className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-black text-white">
              🔥 {Math.round(totals.calories)}
              <span className="text-lg text-neutral-500 font-semibold"> / {goals.calories} kcal</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">{Math.round(remaining)} kcal remaining</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={(totals.calories / goals.calories) * 100} />
        </div>
      </Card>

      {/* Macros */}
      <Card className="p-5 space-y-4">
        <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="#a855f7" />
        <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="#6366f1" />
        <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="#ec4899" />
      </Card>

      {/* Meals */}
      <section>
        <h2 className="text-base font-bold text-neutral-200 mb-3">Meals</h2>
        {meals.length === 0 ? (
          <Card>
            <EmptyState icon="🍽️" text="No meals logged yet" />
          </Card>
        ) : (
          <div className="space-y-2">
            {meals.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{m.name}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      🔥 {m.calories} kcal · P {m.protein}g · C {m.carbs}g · F {m.fat}g
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(m)}
                      className="h-8 w-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteMeal(m.id)}
                      className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit Meal" : "Log Meal"}>
        {!editId && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full mb-3 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-3 text-sm font-semibold text-[#c99bf7] active:scale-95 transition-all disabled:opacity-50"
          >
            {scanning ? "Scanning…" : "📷 Scan Barcode"}
          </button>
        )}
        {servingNote && <p className="text-xs text-amber-400 mb-3">{servingNote}</p>}
        <Field label="Meal name">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories">
            <input type="number" inputMode="numeric" className={inputClass} value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
          </Field>
          <Field label="Protein (g)">
            <input type="number" inputMode="numeric" className={inputClass} value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
          </Field>
          <Field label="Carbs (g)">
            <input type="number" inputMode="numeric" className={inputClass} value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
          </Field>
          <Field label="Fat (g)">
            <input type="number" inputMode="numeric" className={inputClass} value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
          </Field>
        </div>
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save}>
            {editId ? "Save" : "Log"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
