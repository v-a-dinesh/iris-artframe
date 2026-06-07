import { useEffect } from 'react';

/** Sync browser password-manager autofill into React controlled state. */
export function useAutofillSync(
  fields: Array<{ id: string; setValue: (value: string) => void }>
) {
  useEffect(() => {
    const sync = () => {
      for (const { id, setValue } of fields) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el?.value) setValue(el.value);
      }
    };

    sync();
    const timers = [50, 150, 400, 800].map((ms) => window.setTimeout(sync, ms));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- field ids are stable per page
  }, []);
}

export function getSavedLoginEmail(): string {
  try {
    return localStorage.getItem('iris-login-email') ?? '';
  } catch {
    return '';
  }
}

export function saveLoginEmail(email: string): void {
  try {
    localStorage.setItem('iris-login-email', email.trim());
  } catch {
    // ignore quota / private mode
  }
}
