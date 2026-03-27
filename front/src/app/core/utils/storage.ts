import type { AuthSession } from '../models/models';

const AUTH_SESSION_KEY = 'lr16cnstn02.auth';

export function loadAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_SESSION_KEY);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as AuthSession;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}
