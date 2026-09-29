"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { BudgetCategory, BudgetExpense } from "@/lib/types";
import { Card, Modal } from "../ui";

const categories: { key: BudgetCategory; label: string; icon: string; hint: string }[] = [
  { key: "needs", label: "Needs", icon: "◈", hint: "Essentials & bills" },
  { key: "wants", label: "Wants", icon: "◇", hint: "Fun & lifestyle" },
  { key: "savings", label: "Savings", icon: "△", hint: "Save or set aside" },
];

const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const shiftMonth = (key: string, amount: number) => { const d = new Date(`${key}-01T00:00:00`); d.setMonth(d.getMonth() + amount); return monthKey(d); };
const dateForMonth = (key: string) => key === monthKey() ? todayKey() : `${key}-01`;

export function Money() {
  const { state, getBudgetExpenses, setMonthlyIncome, addBudgetExpense, updateBudgetExpense, deleteBudgetExpense, setBudgetRule } = useStore();
  const [month, setMonth] = useState(monthKey());
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [income, setIncome] = useState(String(state.budget.monthlyIncome || ""));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | BudgetCategory>("all");
  const [showAll, setShowAll] = useState(false);
  const [ruleDraft, setRuleDraft] = useState({ needs: state.budget.needsPct, wants: state.budget.wantsPct, savings: state.budget.savingsPct });
  const [form, setForm] = useState({ label: "", amount: "", category: "needs" as BudgetCategory, date: dateForMonth(month) });
  const [error, setError] = useState("");

  const expenses = getBudgetExpenses(month);
  const totals = useMemo(() => categories.reduce((acc, c) => {
    acc[c.key] = expenses.filter((e) => e.category === c.key).reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, { needs: 0, wants: 0, savings: 0 } as Record<BudgetCategory, number>), [expenses]);

  const incomeValue = state.budget.monthlyIncome;
  const spent = totals.needs + totals.wants + totals.savings;
  const left = incomeValue - spent;
  const ruleTotal = state.budget.needsPct + state.budget.wantsPct + state.budget.savingsPct;
  const target = {
    needs: incomeValue * state.budget.needsPct / 100,
    wants: incomeValue * state.budget.wantsPct / 100,
    savings: incomeValue * state.budget.savingsPct / 100,
  };

  const now = new Date();
  const isCurrentMonth = month === monthKey(now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays = isCurrentMonth ? Math.max(1, now.getDate()) : month < monthKey(now) ? daysInMonth : 0;
  const remainingDays = isCurrentMonth ? Math.max(0, daysInMonth - now.getDate()) : 0;
  const dailySpend = elapsedDays ? spent / elapsedDays : 0;
  const projectedSpend = isCurrentMonth ? dailySpend * daysInMonth : spent;
  const pacePct = incomeValue ? projectedSpend / incomeValue * 100 : 0;
  const budgetStatus = !incomeValue ? "Add your income" : left < 0 ? "Over income" : pacePct > 100 ? "Above pace" : pacePct > 90 ? "Near limit" : "On track";

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses
      .filter((e) => filter === "all" || e.category === filter)
      .filter((e) => !q || e.label.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filter, search]);
  const visibleExpenses = showAll ? filteredExpenses : filteredExpenses.slice(0, 6);

  const chartNeeds = state.budget.needsPct;
  const chartWants = chartNeeds + state.budget.wantsPct;
  const chart = `conic-gradient(#a855f7 0 ${chartNeeds}%, #c99bf7 ${chartNeeds}% ${chartWants}%, #7c3aed ${chartWants}% 100%)`;

  const saveIncome = () => {
    const n = Number(income);
    if (!Number.isFinite(n) || n < 0) return;
    setMonthlyIncome(n);
    setIncomeOpen(false);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ label: "", amount: "", category: "needs", date: dateForMonth(month) });
    setError("");
    setExpenseOpen(true);
  };
  const openEdit = (e: BudgetExpense) => {
    setEditId(e.id);
    setForm({ label: e.label, amount: String(e.amount), category: e.category, date: e.date });
    setError("");
    setExpenseOpen(true);
  };
  const saveExpense = () => {
    const amount = Number(form.amount);
    if (!form.label.trim() || !Number.isFinite(amount) || amount <= 0) { setError("Add a label and a positive amount."); return; }
    const payload = { label: form.label.trim(), amount, category: form.category, date: form.date || dateForMonth(month) };
    if (editId) updateBudgetExpense({ ...payload, id: editId }, month); else addBudgetExpense(payload, month);
    setExpenseOpen(false);
  };

  const openRules = () => {
    setRuleDraft({ needs: state.budget.needsPct, wants: state.budget.wantsPct, savings: state.budget.savingsPct });
    setRuleOpen(true);
  };
  const saveRules = () => {
    if (ruleDraft.needs + ruleDraft.wants + ruleDraft.savings !== 100) return;
    setBudgetRule("needs", ruleDraft.needs);
    setBudgetRule("wants", ruleDraft.wants);
    setBudgetRule("savings", ruleDraft.savings);
    setRuleOpen(false);
  };

  return (
    <div className="space-y-4 pb-4">
      <header className="norou-page-head pt-1">
        <div><div className="norou-eyebrow">NOROU MONEY</div><h1>Money</h1><p>A simple monthly cockpit for your spending plan.</p></div>
        <button className="norou-money-income" onClick={() => { setIncome(String(incomeValue || "")); setIncomeOpen(true); }}>
          <small>MONTHLY INCOME</small><strong>{money(incomeValue)}</strong>
        </button>
      </header>

      <Card className="norou-money-month p-3">
        <button aria-label="Previous month" onClick={() => { setMonth(shiftMonth(month, -1)); setShowAll(false); }}>‹</button>
        <div><div className="norou-eyebrow">VIEWING</div><strong>{monthLabel(month)}</strong></div>
        <button aria-label="Next month" onClick={() => { setMonth(shiftMonth(month, 1)); setShowAll(false); }}>›</button>
        <button className="norou-money-today" onClick={() => { setMonth(monthKey()); setShowAll(false); }}>Today</button>
      </Card>

      <Card className="norou-money-hero p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="norou-eyebrow">{left >= 0 ? "LEFT TO BUDGET" : "OVER INCOME"}</div>
            <div className={`norou-money-left ${left < 0 ? "negative" : ""}`}>{money(Math.abs(left))}</div>
            <p className="text-xs text-neutral-500 mt-1">{money(spent)} logged · {budgetStatus}</p>
          </div>
          <div className="norou-money-donut" style={{ background: chart }}><div><strong>{state.budget.needsPct}/{state.budget.wantsPct}/{state.budget.savingsPct}</strong><small>RULE</small></div></div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/7 overflow-hidden"><div className={`h-full rounded-full transition-all ${left < 0 ? "bg-red-400" : "bg-[#a855f7]"}`} style={{ width: `${incomeValue ? Math.min(100, spent / incomeValue * 100) : 0}%` }} /></div>
        <div className="mt-2 flex justify-between text-[9px] font-bold text-neutral-500"><span>{money(spent)} logged</span><span>{money(incomeValue)} planned</span></div>
      </Card>

      <section className="norou-money-insight-grid">
        <Card className="p-4"><small className="norou-money-kicker">SPENDING PACE</small><strong>{incomeValue ? `${Math.round(pacePct)}%` : "—"}</strong><span>{isCurrentMonth ? `${money(dailySpend)}/day average` : "month total"}</span></Card>
        <Card className="p-4"><small className="norou-money-kicker">REMAINING DAYS</small><strong>{isCurrentMonth ? remainingDays : "—"}</strong><span>{isCurrentMonth ? "in this month" : "historical view"}</span></Card>
        <Card className="p-4"><small className="norou-money-kicker">PROJECTED</small><strong>{incomeValue ? money(projectedSpend) : "—"}</strong><span>{isCurrentMonth ? "at current pace" : "logged"}</span></Card>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {categories.map((c) => {
          const remaining = target[c.key] - totals[c.key];
          const pct = target[c.key] ? Math.min(100, totals[c.key] / target[c.key] * 100) : 0;
          return <Card key={c.key} className="p-3 norou-money-bucket">
            <span>{c.icon}</span><small>{c.label.toUpperCase()}</small><strong>{money(totals[c.key])}</strong><em>{target[c.key] ? `${money(Math.max(0, remaining))} left` : c.hint}</em>
            <div className="mt-2 h-1 rounded-full bg-white/7 overflow-hidden"><div className="h-full rounded-full bg-white/35" style={{ width: `${pct}%` }} /></div>
          </Card>;
        })}
      </section>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3"><div><div className="font-black text-white">Your budget split</div><div className="text-[10px] text-neutral-500 mt-1">50/30/20 is a starting framework, not a rule you have to follow.</div></div><button onClick={openRules} className="norou-money-edit">Edit</button></div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/7"><div style={{ width: `${state.budget.needsPct}%` }} className="bg-[#a855f7]" /><div style={{ width: `${state.budget.wantsPct}%` }} className="bg-[#c99bf7]" /><div style={{ width: `${state.budget.savingsPct}%` }} className="bg-[#7c3aed]" /></div>
        <div className="mt-3 grid grid-cols-3 gap-2">{categories.map((c) => <div key={c.key}><div className="text-[9px] text-neutral-500">{c.label}</div><div className="text-xs font-black text-white">{pctLabel(c.key, state.budget)} · {money(target[c.key])}</div></div>)}</div>
      </Card>

      <div className="flex items-center justify-between"><div><div className="norou-eyebrow">TRANSACTIONS</div><h2 className="text-lg font-black text-white mt-1">Where your money goes</h2></div><button onClick={openAdd} className="norou-money-add">+ Add</button></div>

      <Card className="p-3">
        <div className="norou-money-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses" /></div>
        <div className="flex gap-2 mt-3 overflow-x-auto">{(["all", "needs", "wants", "savings"] as const).map((key) => <button key={key} onClick={() => { setFilter(key); setShowAll(false); }} className={`norou-money-filter ${filter === key ? "active" : ""}`}>{key === "all" ? "All" : key[0].toUpperCase() + key.slice(1)}</button>)}</div>
      </Card>

      {filteredExpenses.length === 0 ? <Card><div className="p-7 text-center"><div className="text-2xl">£</div><div className="font-bold text-white mt-2">Nothing here yet</div><p className="text-xs text-neutral-500 mt-1">Add an expense to start seeing your monthly picture.</p><button onClick={openAdd} className="norou-money-add mt-4">Add expense</button></div></Card> : <div className="space-y-2">
        {visibleExpenses.map((e) => <Card key={e.id} className="p-4"><div className="flex items-center gap-3"><div className={`norou-money-cat ${e.category}`}>{e.category === "needs" ? "◈" : e.category === "wants" ? "◇" : "△"}</div><div className="min-w-0 flex-1"><div className="font-semibold text-white truncate">{e.label}</div><div className="text-[10px] text-neutral-500 mt-0.5">{new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {e.category}</div></div><strong className="text-sm text-white">{money(e.amount)}</strong><button aria-label={`Edit ${e.label}`} onClick={() => openEdit(e)} className="text-xs text-neutral-500">✎</button><button aria-label={`Delete ${e.label}`} onClick={() => deleteBudgetExpense(e.id, month)} className="text-xs text-red-400">×</button></div></Card>)}
        {filteredExpenses.length > 6 && <button onClick={() => setShowAll((v) => !v)} className="w-full py-3 text-xs font-bold text-violet-300">{showAll ? "Show less" : `Show all ${filteredExpenses.length} expenses`}</button>}
      </div>}

      <Card className="p-4 norou-money-note"><div className="text-xs font-black text-white">Planning note</div><p className="text-[10px] text-neutral-500 mt-1.5 leading-relaxed">Norou keeps this budget on your device. The 50/30/20 split is a general budgeting framework; your real needs and priorities may call for a different mix.</p></Card>

      <Modal open={incomeOpen} onClose={() => setIncomeOpen(false)} title="Monthly income"><div className="space-y-4"><label className="block"><span className="text-xs font-bold text-neutral-300">Planned monthly income</span><input autoFocus inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white outline-none" placeholder="2500" /></label><button onClick={saveIncome} className="w-full rounded-xl bg-[#a855f7] p-3 text-sm font-black text-white">Save income</button></div></Modal>

      <Modal open={ruleOpen} onClose={() => setRuleOpen(false)} title="Budget split"><div className="space-y-4"><p className="text-xs text-neutral-500">Adjust the three percentages. They must add up to 100%.</p>{categories.map((c) => <label key={c.key} className="block"><div className="flex justify-between text-xs font-bold text-neutral-300"><span>{c.label}</span><span>{ruleDraft[c.key]}%</span></div><input type="range" min="0" max="100" value={ruleDraft[c.key]} onChange={(e) => setRuleDraft({ ...ruleDraft, [c.key]: Number(e.target.value) })} className="w-full mt-2" /></label>)}<div className={`rounded-xl p-3 text-xs font-bold ${ruleDraft.needs + ruleDraft.wants + ruleDraft.savings === 100 ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>Total: {ruleDraft.needs + ruleDraft.wants + ruleDraft.savings}%</div><div className="grid grid-cols-2 gap-2"><button onClick={() => setRuleDraft({ needs: 50, wants: 30, savings: 20 })} className="rounded-xl border border-white/10 p-3 text-xs font-bold text-neutral-300">Reset 50/30/20</button><button disabled={ruleDraft.needs + ruleDraft.wants + ruleDraft.savings !== 100} onClick={saveRules} className="rounded-xl bg-[#a855f7] p-3 text-xs font-black text-white disabled:opacity-40">Save split</button></div></div></Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title={editId ? "Edit expense" : "Add expense"}><div className="space-y-3"><input autoFocus value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white outline-none" placeholder="e.g. Transport" /><input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white outline-none" placeholder="Amount" /><div className="grid grid-cols-3 gap-2">{categories.map((c) => <button key={c.key} onClick={() => setForm({ ...form, category: c.key })} className={`rounded-xl border p-2 text-xs font-bold ${form.category === c.key ? "border-[#a855f7] bg-[#a855f7]/15 text-white" : "border-white/8 text-neutral-500"}`}>{c.label}</button>)}</div><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white outline-none" />{error && <p className="text-xs text-red-400">{error}</p>}<button onClick={saveExpense} className="w-full rounded-xl bg-[#a855f7] p-3 text-sm font-black text-white">Save expense</button></div></Modal>
    </div>
  );
}

function pctLabel(category: BudgetCategory, budget: { needsPct: number; wantsPct: number; savingsPct: number }) {
  return `${category === "needs" ? budget.needsPct : category === "wants" ? budget.wantsPct : budget.savingsPct}%`;
}
