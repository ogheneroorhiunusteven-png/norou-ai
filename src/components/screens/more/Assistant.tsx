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
  const [voice, setVoice] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceChat, setVoiceChat] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getBackendUrl().then((url) => setConfigured(!!url));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  useEffect(() => () => {
    try { recognitionRef.current?.abort?.(); } catch {}
    recognitionRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice input is not available in this app build. You can still type normally."); return; }
    try { recognitionRef.current?.abort?.(); } catch {}
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { voiceTranscriptRef.current = ""; setVoice(true); };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results ?? []).map((r: any) => r?.[0]?.transcript ?? "").join(" ").trim();
      if (transcript) { voiceTranscriptRef.current = transcript; setInput(transcript); }
    };
    recognition.onerror = (event: any) => {
      setVoice(false);
      recognitionRef.current = null;
      if (event?.error !== "aborted" && event?.error !== "no-speech") setError(`Voice input error: ${event.error ?? "unknown"}`);
    };
    recognition.onend = () => {
      setVoice(false);
      recognitionRef.current = null;
      const spoken = voiceTranscriptRef.current.trim();
      if (voiceChat && spoken) setTimeout(() => { void send(spoken); }, 60);
    };
    try { recognition.start(); } catch { setVoice(false); recognitionRef.current = null; setError("Nova could not start the microphone. Try again."); }
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const send = async (spokenText?: string) => {
    const text = (spokenText ?? input).trim();
    if (!text || sending) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const reply = await sendChatMessage(next, state);
      setMessages([...next, { role: "assistant", content: reply.text }]);
      if (voiceChat) speak(reply.text);
      if (speaking) window.speechSynthesis.cancel();
      for (const fact of reply.newMemories) addMemory(fact, "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  if (configured === null) return null; // brief flash while checking Preferences


  return (
    <div className="flex flex-col chat-height">
      <div
        className="flex-1 overflow-y-auto space-y-3 pr-1"
        style={{ paddingBottom: "var(--keyboard-inset, 0px)" }}
      >
        {messages.length === 0 && (
          <Card className="p-4 text-sm text-neutral-400">
            Ask about your progress, get advice on your routine, or just say what&apos;s on your mind. {configured ? "Full AI is connected." : "Offline mode is active — no API key is required for local features."}
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
              {m.role === "assistant" && <button onClick={() => speak(m.content)} className="ml-2 text-[10px] text-neutral-500">🔊</button>}
            </div>
          </div>
        ))}
        {sending && <div className="text-xs text-neutral-500 px-2">Nova is thinking…</div>}
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
        <button type="button" onClick={() => { if (voice) { try { recognitionRef.current?.stop?.(); } catch {} setVoice(false); } else { setVoiceChat(true); startVoice(); } }} className={`min-h-11 min-w-11 rounded-xl px-3 py-2 text-sm ${voice ? "bg-red-500/20 text-red-300" : voiceChat ? "bg-[#a855f7]/20 text-[#d8b4fe]" : "bg-[#2a2a2a] text-neutral-300"}`}>{voice ? "Listening…" : voiceChat ? "🎙 On" : "🎙"}</button>
        <Button onClick={() => send()} disabled={sending || !input.trim()}>Send</Button>
      </div>
    </div>
  );
}
