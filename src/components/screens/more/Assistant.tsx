"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Button } from "../../ui";
import { getBackendUrl, sendChatMessage, type ChatMessage } from "@/lib/assistant";

export function Assistant() {
  const { state, addMemory } = useStore();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getBackendUrl().then((url) => setConfigured(!!url));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const reply = await sendChatMessage(next, state);
      setMessages([...next, { role: "assistant", content: reply.text }]);
      for (const fact of reply.newMemories) addMemory(fact, "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  if (configured === null) return null; // brief flash while checking Preferences

  if (!configured) {
    return (
      <Card className="p-5 text-center space-y-2">
        <div className="text-3xl mb-1">🤖</div>
        <p className="text-sm font-semibold text-white">AI Assistant isn&apos;t set up yet</p>
        <p className="text-xs text-neutral-400">
          This needs a backend URL configured in Settings → AI Assistant first — see the setup guide in the project&apos;s{" "}
          <code className="text-neutral-300">ai-backend/README.md</code> for the two-minute deploy.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <Card className="p-4 text-sm text-neutral-400">
            Ask about your progress, get advice on your routine, or just say what&apos;s on your mind. I can see your level,
            streaks, and today&apos;s activity.
          </Card>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-[#a855f7] text-white" : "bg-[#2a2a2a] text-neutral-100 border border-white/5"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <div className="text-xs text-neutral-500 px-2">Thinking…</div>}
        {error && <div className="text-xs text-red-400 px-2">{error}</div>}
        <div ref={scrollRef} />
      </div>
      <div className="flex gap-2 pt-3">
        <input
          className="flex-1 rounded-xl bg-[#2a2a2a] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#a855f7]/50"
          placeholder="Message your assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
