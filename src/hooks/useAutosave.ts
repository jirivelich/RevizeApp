import { useEffect, useState, useRef, useCallback } from 'react';
import type { Revize } from '../types';

export type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface UseAutosaveReturn {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  /** Signals that the NEXT formData change should be saved immediately (no debounce). */
  saveNow: () => void;
  /** Flushes pending debounce timer immediately. Returns a Promise that resolves when the save is done. */
  flush: () => Promise<void>;
}

export function useAutosave(
  formData: Partial<Revize>,
  originalData: Revize | null,
  saveFn: (data: Partial<Revize>) => Promise<void>,
  delay = 1500,
): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const baselineRef = useRef('');
  const isReadyRef = useRef(false);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<AutosaveStatus>('idle');
  const saveImmediatelyRef = useRef(false);

  const doSave = useCallback(async (data: Partial<Revize>) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setStatus('saving');
    statusRef.current = 'saving';
    try {
      await saveFnRef.current(data);
      baselineRef.current = JSON.stringify(data);
      setStatus('saved');
      statusRef.current = 'saved';
      setLastSavedAt(new Date());
    } catch {
      setStatus('error');
      statusRef.current = 'error';
    }
  }, []);

  // Initialize / reset baseline when a new revision loads (id change).
  // Does NOT re-run on background refetches of the same revision.
  useEffect(() => {
    if (originalData) {
      baselineRef.current = JSON.stringify(originalData);
      isReadyRef.current = true;
      setStatus('idle');
      statusRef.current = 'idle';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalData?.id]);

  // Watch formData changes → debounce or immediate save
  useEffect(() => {
    if (!isReadyRef.current) return;
    if (JSON.stringify(formData) === baselineRef.current) return;

    setStatus('unsaved');
    statusRef.current = 'unsaved';

    if (saveImmediatelyRef.current) {
      saveImmediatelyRef.current = false;
      doSave(formData);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      doSave(formDataRef.current);
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Flush any pending save on unmount (e.g. navigating away)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (statusRef.current === 'unsaved') {
          doSave(formDataRef.current);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Flush debounce timer now (e.g. on tab switch or before navigation). */
  const flush = useCallback((): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      return doSave(formDataRef.current);
    }
    return Promise.resolve();
  }, [doSave]);

  /**
   * Signal that the next formData change should skip debounce and save immediately.
   * Call this in the onChange handler of selects / checkboxes BEFORE or AFTER setFormData.
   */
  const saveNow = useCallback(() => {
    saveImmediatelyRef.current = true;
  }, []);

  return { status, lastSavedAt, saveNow, flush };
}
