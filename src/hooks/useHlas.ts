import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hlasové ovládání přes Web Speech API prohlížeče (bez dalších nákladů):
 * - rozpoznávání řeči (diktování) – Chrome, Edge, Safari, Chrome na Androidu
 * - předčítání textu (syntéza řeči) – prakticky všechny prohlížeče
 */

// Minimální typy – SpeechRecognition není ve standardních DOM typech TypeScriptu.
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: SpeechRecognitionAlternativeLike }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionErrorEventLike { error: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const CHYBY: Record<string, string> = {
  'not-allowed': 'Přístup k mikrofonu je zakázaný. Povolte ho v nastavení prohlížeče.',
  'service-not-allowed': 'Rozpoznávání řeči není v tomto prohlížeči povolené.',
  'audio-capture': 'Mikrofon nebyl nalezen.',
  network: 'Rozpoznávání řeči potřebuje připojení k internetu.',
  'language-not-supported': 'Prohlížeč nepodporuje rozpoznávání češtiny.',
};

interface DiktovaniOptions {
  /** Průběžný text (mění se, jak uživatel mluví). */
  onText: (text: string) => void;
  /** Hotový přepis po domluvení. */
  onKonec?: (text: string) => void;
}

export function useDiktovani({ onText, onKonec }: DiktovaniOptions) {
  const [posloucha, setPosloucha] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const textRef = useRef('');
  const cbRef = useRef({ onText, onKonec });
  useEffect(() => { cbRef.current = { onText, onKonec }; });

  const podporovano = getRecognitionCtor() !== null;

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback((uvodniText = '') => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current) return;
    setChyba(null);
    const rec = new Ctor();
    rec.lang = 'cs-CZ';
    rec.continuous = false; // ukončí se samo po pauze v řeči
    rec.interimResults = true;
    const zaklad = uvodniText.trim() ? `${uvodniText.trim()} ` : '';
    textRef.current = zaklad;

    rec.onresult = (e) => {
      let finalni = '';
      let prubezne = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalni += r[0].transcript;
        else prubezne += r[0].transcript;
      }
      textRef.current = (zaklad + finalni + prubezne).replace(/\s+/g, ' ');
      cbRef.current.onText(textRef.current);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setChyba(CHYBY[e.error] ?? `Chyba rozpoznávání řeči (${e.error}).`);
      }
    };
    rec.onend = () => {
      recRef.current = null;
      setPosloucha(false);
      const hotovo = textRef.current.trim();
      if (hotovo && hotovo !== zaklad.trim()) cbRef.current.onKonec?.(hotovo);
    };

    recRef.current = rec;
    try {
      rec.start();
      setPosloucha(true);
    } catch {
      recRef.current = null;
      setChyba('Rozpoznávání řeči se nepodařilo spustit.');
    }
  }, []);

  // Při odchodu ze stránky mikrofon vypnout
  useEffect(() => () => recRef.current?.abort(), []);

  return { podporovano, posloucha, chyba, start, stop };
}

// ==================== Předčítání ====================

const predcitaniPodporovano = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function ceskyHlas(): SpeechSynthesisVoice | undefined {
  const hlasy = window.speechSynthesis.getVoices();
  return hlasy.find((v) => v.lang === 'cs-CZ' && v.localService) ?? hlasy.find((v) => v.lang.toLowerCase().startsWith('cs'));
}

/** Upraví text pro předčítání (zkratky, odrážky, emoji). */
export function textProPredcitani(text: string): string {
  return text
    .replace(/^\s*-\s+/gm, '')
    .replace(/ČSN/g, 'čé es en')
    .replace(/\bC([123])\b/g, 'cé $1')
    .replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function usePredcitani() {
  const [mluvi, setMluvi] = useState(false);
  const podporovano = predcitaniPodporovano();

  useEffect(() => {
    if (!podporovano) return;
    // Seznam hlasů se v Chromu načítá asynchronně
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, [podporovano]);

  const zastav = useCallback(() => {
    if (!predcitaniPodporovano()) return;
    window.speechSynthesis.cancel();
    setMluvi(false);
  }, []);

  /** Přečte text nahlas; onKonec se zavolá po dočtení (ne při přerušení). */
  const precti = useCallback((text: string, onKonec?: () => void) => {
    if (!predcitaniPodporovano()) { onKonec?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(textProPredcitani(text));
    u.lang = 'cs-CZ';
    const hlas = ceskyHlas();
    if (hlas) u.voice = hlas;
    u.onend = () => { setMluvi(false); onKonec?.(); };
    u.onerror = () => setMluvi(false);
    setMluvi(true);
    window.speechSynthesis.speak(u);
  }, []);

  return { podporovano, mluvi, precti, zastav };
}
