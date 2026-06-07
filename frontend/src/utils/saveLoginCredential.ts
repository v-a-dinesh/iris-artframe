interface PasswordCredentialInit {
  id: string;
  password: string;
  name?: string;
}

/** Prompt Chrome (and other browsers) to save login credentials after SPA auth. */
export async function tryStoreLoginCredential(email: string, password: string): Promise<void> {
  if (!('PasswordCredential' in window) || !navigator.credentials?.store) {
    return;
  }

  try {
    const PasswordCredentialCtor = window.PasswordCredential as unknown as new (
      data: PasswordCredentialInit
    ) => Credential;

    const credential = new PasswordCredentialCtor({
      id: email,
      password,
      name: email,
    });

    await navigator.credentials.store(credential);
  } catch {
    // User dismissed the dialog or the browser blocked storage.
  }
}

/** Full navigation helps Chrome detect a successful login for its built-in save prompt. */
export function redirectAfterLogin(path = '/dashboard'): void {
  window.location.assign(path);
}
