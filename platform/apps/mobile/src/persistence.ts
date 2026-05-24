// Hook usePersistedState — persiste valor em AsyncStorage com fallback
// para useState in-memory se o módulo não estiver instalado (ex: antes
// de correr `expo install @react-native-async-storage/async-storage`).
import { useCallback, useEffect, useRef, useState } from 'react';

// Carrega AsyncStorage de forma defensiva. Se não estiver instalado, fica
// null e o hook comporta-se como useState normal.
let AsyncStorage: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
} | null = null;
try {
  // require dinâmico — o bundler do Metro consegue tree-shake disto.

  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}

export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  // Hidrata uma vez ao montar.
  useEffect(() => {
    let cancelled = false;
    if (!AsyncStorage) { loaded.current = true; return; }
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled) return;
        if (raw != null) {
          try { setValue(JSON.parse(raw) as T); }
          catch { /* ignore parse errors */ }
        }
        loaded.current = true;
      })
      .catch(() => { loaded.current = true; });
    return () => { cancelled = true; };
  }, [key]);

  // Escreve quando o valor muda (após hidratação).
  useEffect(() => {
    if (!loaded.current || !AsyncStorage) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {/* swallow */});
  }, [key, value]);

  const setter = useCallback((updater: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater));
  }, []);

  return [value, setter];
}
