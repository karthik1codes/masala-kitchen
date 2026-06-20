"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KitchenInteraction } from "../lib/kitchen";
import type { KitchenPlan } from "../lib/kitchenCustom";
import { resolveVoiceToInteraction } from "../lib/kitchenVoiceMatch";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: SpeechRecognitionResultList; resultIndex: number }) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isKitchenVoiceSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

interface UseKitchenVoiceControlOptions {
  enabled: boolean;
  plan: KitchenPlan;
  completedStepIds: string[];
  onMatch: (item: KitchenInteraction, transcript: string) => void;
  lang?: string;
}

export function useKitchenVoiceControl({
  enabled,
  plan,
  completedStepIds,
  onMatch,
  lang = "en-IN",
}: UseKitchenVoiceControlOptions) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supported = isKitchenVoiceSupported();

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const wantListenRef = useRef(false);
  const cooldownRef = useRef(false);
  const onMatchRef = useRef(onMatch);
  const planRef = useRef(plan);
  const completedRef = useRef(completedStepIds);

  onMatchRef.current = onMatch;
  planRef.current = plan;
  completedRef.current = completedStepIds;

  const handleTranscript = useCallback((raw: string, isFinal: boolean) => {
    setTranscript(raw);
    if (!isFinal || cooldownRef.current) return;

    const item = resolveVoiceToInteraction(
      raw,
      planRef.current,
      completedRef.current,
    );
    if (!item) return;

    cooldownRef.current = true;
    onMatchRef.current(item, raw);
    window.setTimeout(() => {
      cooldownRef.current = false;
    }, 1400);
  }, []);

  const stopRecognition = useCallback(() => {
    wantListenRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice not supported in this browser");
      return;
    }

    setError(null);
    wantListenRef.current = true;

    if (!recognitionRef.current) {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;

      rec.onstart = () => setListening(true);

      rec.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript?.trim() ?? "";
          if (result.isFinal) finalText += `${text} `;
          else interim += `${text} `;
        }
        const combined = (finalText || interim).trim();
        if (combined) handleTranscript(combined, Boolean(finalText.trim()));
      };

      rec.onerror = (event) => {
        if (event.error === "not-allowed") {
          setError("Microphone permission denied");
          wantListenRef.current = false;
        } else if (event.error !== "aborted" && event.error !== "no-speech") {
          setError(event.error);
        }
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
        if (wantListenRef.current && enabled) {
          window.setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch {
              /* already started */
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
    }

    recognitionRef.current.lang = lang;

    try {
      recognitionRef.current.start();
    } catch {
      /* already running */
    }
  }, [enabled, handleTranscript, lang]);

  const toggleListening = useCallback(() => {
    if (listening || wantListenRef.current) {
      stopRecognition();
    } else {
      startRecognition();
    }
  }, [listening, startRecognition, stopRecognition]);

  useEffect(() => {
    if (!enabled) {
      stopRecognition();
      return;
    }
    startRecognition();
    return () => stopRecognition();
  }, [enabled, startRecognition, stopRecognition]);

  return {
    supported,
    listening,
    transcript,
    error,
    toggleListening,
    stopRecognition,
  };
}
