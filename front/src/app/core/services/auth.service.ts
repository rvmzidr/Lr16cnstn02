import { UrlTree } from '@angular/router';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { api, ApiError } from './api';
import type { AuthSession, Role } from '../models/models';
import { loadAuthSession, saveAuthSession } from '../utils/storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly hydrated = signal(false);
  private hydrationPromise: Promise<void> | null = null;
  readonly session = signal<AuthSession | null>(loadAuthSession());
  readonly isReady = computed(() => this.hydrated());
  readonly isAuthenticated = computed(() => Boolean(this.session()?.accessToken));

  constructor() {
    this.hydrate();
  }

  async hydrate() {
    if (this.hydrationPromise) {
      return this.hydrationPromise;
    }

    this.hydrationPromise = (async () => {
      const currentSession = loadAuthSession();
      if (!currentSession?.accessToken) {
        this.session.set(null);
        this.hydrated.set(true);
        return;
      }

      try {
        const profile = await api.getProfile(currentSession.accessToken);
        const nextSession: AuthSession = {
          accessToken: currentSession.accessToken,
          utilisateur: {
            ...currentSession.utilisateur,
            ...profile.utilisateur
          }
        };
        this.session.set(nextSession);
        saveAuthSession(nextSession);
      } catch {
        this.session.set(null);
        saveAuthSession(null);
      } finally {
        this.hydrated.set(true);
      }
    })();

    return this.hydrationPromise;
  }

  async login(emailInstitutionnel: string, motDePasse: string) {
    const response = await api.login({ emailInstitutionnel, motDePasse });
    const nextSession: AuthSession = {
      accessToken: response.accessToken,
      utilisateur: response.utilisateur
    };
    this.session.set(nextSession);
    saveAuthSession(nextSession);
  }

  logout() {
    this.session.set(null);
    saveAuthSession(null);
  }

  async refreshProfile() {
    const currentSession = this.session();
    if (!currentSession?.accessToken) {
      return;
    }

    try {
      const profile = await api.getProfile(currentSession.accessToken);
      const nextSession: AuthSession = {
        accessToken: currentSession.accessToken,
        utilisateur: {
          ...currentSession.utilisateur,
          ...profile.utilisateur
        }
      };
      this.session.set(nextSession);
      saveAuthSession(nextSession);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.logout();
      }
      throw error;
    }
  }
}

async function ensureHydrated(auth: AuthService) {
  await auth.hydrate();
}

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureHydrated(auth);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/connexion'], {
    queryParams: {
      next: `${state.url || route.routeConfig?.path || '/dashboard'}`
    }
  });
};

export const publicOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureHydrated(auth);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

export function roleGuard(allowedRoles: Role[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await ensureHydrated(auth);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/connexion']);
    }

    const role = auth.session()?.utilisateur.role;
    return role && allowedRoles.includes(role) ? true : router.createUrlTree(['/dashboard']);
  };
}
