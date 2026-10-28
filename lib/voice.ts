"use client";

import { create } from "zustand";
import { isMuted } from "@/lib/sound";

/*
 * Ano's voice in the browser (CLAUDE.md §7.4). Off by default. Ask Ano
 * answers try the server voice (ElevenLabs via /api/ano-voice) first; written
 * lines and every failure use the browser's speechSynthesis, so speaking
 * never shows an error. Captions are the speech bubble's text, always shown.
 */

interface VoiceState {
  enabled: boolean;
  /** The line being spoken right now (drives Ano's talk animation and captions). */
  speaking: string | null;
  setEnabled: (enabled: boolean) => void;
}

export const useVoice = create<VoiceState>()((set) => ({
  enabled: false,
  speaking: null,
  setEnabled: (enabled) => {
    if (!enabled) stopSpeaking();
    set({ enabled });
  },
}));

let audio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

export function stopSpeaking(): void {
  audio?.pause();
  audio = null;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  useVoice.setState({ speaking: null });
}

function browserSpeak(text: string): void {
  if (!("speechSynthesis" in window)) {
    useVoice.setState({ speaking: null });
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((v) => /en[-_](GB|US)/i.test(v.lang) && /female|samantha|serena|google/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  utterance.rate = 1.03;
  utterance.pitch = 1.18;
  utterance.onend = utterance.onerror = () => {
    if (useVoice.getState().speaking === text) useVoice.setState({ speaking: null });
  };
  window.speechSynthesis.speak(utterance);
}

/** Speak one of Ano's lines. `fromAi` lines try the server voice first. */
export async function speak(text: string, { fromAi = false }: { fromAi?: boolean } = {}): Promise<void> {
  stopSpeaking();
  // Mute silences everything, Ano's voice too; the words stay on screen as the caption.
  if (isMuted()) return;
  useVoice.setState({ speaking: text });
  if (fromAi) {
    try {
      const res = await fetch("/api/ano-voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok && res.headers.get("content-type")?.startsWith("audio/")) {
        if (useVoice.getState().speaking !== text) return;
        audioUrl = URL.createObjectURL(await res.blob());
        audio = new Audio(audioUrl);
        audio.onended = () => stopSpeaking();
        await audio.play();
        return;
      }
    } catch {
      // Fall through to the browser's voice.
    }
  }
  if (useVoice.getState().speaking === text) browserSpeak(text);
}
