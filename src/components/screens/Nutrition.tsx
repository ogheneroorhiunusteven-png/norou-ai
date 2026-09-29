"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { Card, ProgressBar, Modal, Field, inputClass, Button, EmptyState } from "../ui";
import { isScannerSupported, ensureScannerPermission, scanBarcode, lookupBarcode } from "@/lib/food-scanner";

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return <div>
    <div className="flex items-center justify-between text-xs mb-1"><span className="font-semibold text-neutral-300">{label}</span><span className="text-neutral-500">{Math.round(value)}g / {goal}g</span></div>
    <div className="h-2 rounded-full bg-white/7 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} /></div>
  </div>;
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

  const totals = useMemo(() => meals.reduce((acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [meals]);
  const remaining = Math.max(0, goals.calories - totals.calories);
  const caloriePct = goals.calories ? Math.min(100, totals.calories / goals.calories * 100) : 0;

  const openAdd = () => { setEditId(null); setForm(emptyForm); setError(""); setServingNote(null); setOpen(true); };
  const openEdit = (m: Meal) => { setEditId(m.id); setForm({ name: m.name, calories: String(m.calories), protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat) }); setError(""); setServingNote(null); setOpen(true); };

  const handleScan = async () => {
    setError("");
    if (!(await isScannerSupported())) return setError("Barcode scanning isn't available on this device.");
    if (!(await ensureScannerPermission())) return setError("Camera permission is needed to scan a barcode.");
    setScanning(true);
    try {
      const code = await scanBarcode();
      if (!code) return;
      const food = await lookupBarcode(code);
      if (!food) return setError("Product not found. You can still enter it manually.");
      setForm({ name: food.name, calories: String(food.calories), protein: String(food.protein), carbs: String(food.carbs), fat: String(food.fat) });
      setServingNote(food.servingSize ? `Per 100g (label serving: ${food.servingSize}) — adjust for your actual portion.` : "Per 100g — adjust for your actual portion.");
    } catch { setError("Scan failed or was cancelled."); } finally { setScanning(false); }
  };

  const save = () => {
    const nums = [form.calories, form.protein, form.carbs, form.fat].map((v) => { const n = parseFloat(v || "0"); return Number.isFinite(n) && n >= 0 ? n : NaN; });
    if (!form.name.trim() || nums.some(Number.isNaN)) return setError("Add a meal name and valid nutrition values.");
    const [calories, protein, carbs, fat] = nums;
    const payload = { name: form.name.trim(), calories, protein, carbs, fat };
    if (editId) updateMeal({ ...payload, id: editId }); else addMeal(payload);
    setOpen(false);
  };

  return <div className="space-y-4 pb-4">
    <header className="norou-page-head pt-1">
      <div><div className="norou-eyebrow">NOVA FUEL</div><h1>Fuel</h1><p>See what you&apos;ve logged and keep your day organised.</p></div>
      <button className="norou-money-add" onClick={openAdd}>+ Log</button>
    </header>

    <Card className="norou-fuel-hero p-5">
      <div className="flex items-start justify-between gap-4">
        <div><div className="norou-eyebrow">TODAY&apos;S FUEL</div><div className="norou-fuel-cal"><strong>{Math.round(totals.calories)}</strong><span> / {goals.calories} kcal</span></div><p className="text-xs text-neutral-500 mt-1">{Math.round(remaining)} kcal remaining in your plan</p></div>
        <div className="norou-fuel-ring"><strong>{Math.round(caloriePct)}%</strong><small>LOGGED</small></div>
      </div>
      <div className="mt-5"><div className="h-2 rounded-full bg-white/7 overflow-hidden"><div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${caloriePct}%` }} /></div><div className="mt-2 flex justify-between text-[9px] font-bold text-neutral-600"><span>{meals.length} {meals.length === 1 ? "entry" : "entries"}</span><span>{goals.calories} kcal target</span></div></div>
    </Card>

    <section className="norou-fuel-grid">
      <Card className="p-4"><span className="norou-fuel-kicker">PROTEIN</span><strong>{Math.round(totals.protein)}g</strong><small>{goals.protein}g target</small></Card>
      <Card className="p-4"><span className="norou-fuel-kicker">CARBS</span><strong>{Math.round(totals.carbs)}g</strong><small>{goals.carbs}g target</small></Card>
      <Card className="p-4"><span className="norou-fuel-kicker">FAT</span><strong>{Math.round(totals.fat)}g</strong><small>{goals.fat}g target</small></Card>
    </section>

    <Card className="p-4 space-y-4">
      <div><div className="font-black text-white">Macro balance</div><div className="text-[10px] text-neutral-600 mt-1">Your logged intake compared with your current targets.</div></div>
      <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="#a855f7" />
      <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="#c99bf7" />
      <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="#7c3aed" />
    </Card>

    <section>
      <div className="flex items-center justify-between mb-3"><div><div className="norou-eyebrow">TODAY</div><h2 className="text-lg font-black text-white mt-1">Meals & entries</h2></div><button className="norou-link" onClick={openAdd}>Add meal →</button></div>
      {meals.length === 0 ? <Card><EmptyState icon="◌" text="No food logged yet" /></Card> : <div className="space-y-2">{meals.map((m) => <Card key={m.id} className="norou-fuel-entry p-4"><div className="flex items-center gap-3"><div className="norou-fuel-icon">◌</div><div className="min-w-0 flex-1"><div className="font-bold text-white truncate">{m.name}</div><div className="text-[10px] text-neutral-500 mt-1">{m.calories} kcal · P {m.protein}g · C {m.carbs}g · F {m.fat}g</div></div><div className="flex gap-1"><button onClick={() => openEdit(m)} className="h-8 w-8 rounded-lg bg-white/5 text-neutral-400">✎</button><button onClick={() => deleteMeal(m.id)} className="h-8 w-8 rounded-lg bg-white/5 text-neutral-400">×</button></div></div></Card>)}</div>}
    </section>

    <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit meal" : "Log meal"}>
      {!editId && <button onClick={handleScan} disabled={scanning} className="w-full mb-3 rounded-xl border border-[#a855f7]/25 bg-[#a855f7]/8 px-4 py-3 text-sm font-semibold text-[#c99bf7] disabled:opacity-50">{scanning ? "Scanning…" : "⌕ Scan barcode"}</button>}
      {servingNote && <p className="text-xs text-amber-400 mb-3">{servingNote}</p>}
      <Field label="Meal name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Calories"><input type="number" className={inputClass} value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></Field><Field label="Protein (g)"><input type="number" className={inputClass} value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></Field><Field label="Carbs (g)"><input type="number" className={inputClass} value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></Field><Field label="Fat (g)"><input type="number" className={inputClass} value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} /></Field></div>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button><Button className="flex-1" onClick={save}>Save</Button></div>
    </Modal>
  </div>;
}
