import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AccessModuleKey,
  AccessPermissionKey,
  AccessWidgetKey,
  UserAccessContext,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';

@Injectable({ providedIn: 'root' })
export class AccessContextService {
  private readonly auth = inject(AuthService);
  private readonly site = inject(SitePreferencesService);

  private loadingPromise: Promise<void> | null = null;

  readonly context = signal<UserAccessContext | null>(null);
  readonly isLoaded = signal(false);

  readonly moduleMap = computed<Record<string, boolean>>(() => {
    const context = this.context();
    if (!context) {
      return {};
    }

    return Object.fromEntries(
      context.effective.modules.map((item) => [item.key, Boolean(item.isVisible)]),
    );
  });

  readonly permissionMap = computed<Record<string, boolean>>(() => {
    const context = this.context();
    if (!context) {
      return {};
    }

    return Object.fromEntries(
      context.effective.permissions.map((item) => [item.key, Boolean(item.isAllowed)]),
    );
  });

  readonly widgetMap = computed<Record<string, boolean>>(() => {
    const context = this.context();
    if (!context) {
      return {};
    }

    return Object.fromEntries(
      context.effective.widgets.map((item) => [item.key, Boolean(item.isVisible)]),
    );
  });

  readonly defaultLandingPage = computed(
    () => this.context()?.effective.defaultLandingPage || '/dashboard',
  );

  readonly availableLanguages = computed(
    () => this.context()?.effective.allowedLanguages || ['fr', 'en', 'ar'],
  );

  async ensureLoaded(force = false) {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      this.context.set(null);
      this.isLoaded.set(true);
      return;
    }

    if (!force && this.isLoaded()) {
      return;
    }

    if (!force && this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = (async () => {
      try {
        const context = await api.getMyAccessContext(token);
        this.context.set(context);
        this.applyLanguagePolicy(context);
      } catch {
        this.context.set(null);
      } finally {
        this.isLoaded.set(true);
      }
    })();

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  async refresh() {
    this.isLoaded.set(false);
    await this.ensureLoaded(true);
  }

  isModuleVisible(moduleKey: AccessModuleKey) {
    const context = this.context();
    if (!context) {
      return true;
    }

    return Boolean(this.moduleMap()[moduleKey]);
  }

  isPermissionAllowed(permissionKey: AccessPermissionKey) {
    const context = this.context();
    if (!context) {
      return true;
    }

    return Boolean(this.permissionMap()[permissionKey]);
  }

  isWidgetVisible(widgetKey: AccessWidgetKey) {
    const context = this.context();
    if (!context) {
      return true;
    }

    return Boolean(this.widgetMap()[widgetKey]);
  }

  private applyLanguagePolicy(context: UserAccessContext) {
    const allowed = context.effective.allowedLanguages || ['fr', 'en', 'ar'];
    const current = this.site.language();

    if (allowed.includes(current)) {
      return;
    }

    const fallback = context.effective.defaultLanguage || allowed[0] || 'fr';
    this.site.setLanguage(fallback);
  }
}
