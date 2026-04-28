import { Injectable, inject, signal } from '@angular/core';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { AccessContextService } from './access-context.service';
import { RoleService } from './role.service';

@Injectable({ providedIn: 'root' })
export class NotificationsStateService {
  private readonly auth = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly accessContext = inject(AccessContextService);

  private refreshPromise: Promise<void> | null = null;

  readonly unreadCount = signal(0);

  async refresh(force = false) {
    if (!force && this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    this.refreshPromise = (async () => {
      const token = this.auth.session()?.accessToken;
      if (!token) {
        this.unreadCount.set(0);
        return;
      }

      await this.accessContext.ensureLoaded();

      if (
        !this.accessContext.isModuleVisible('notifications') ||
        !this.accessContext.isPermissionAllowed('canViewNotifications')
      ) {
        this.unreadCount.set(0);
        return;
      }

      try {
        if (this.roleService.isAdmin()) {
          const response = await api.getAdminUnreadNotificationsCount(token);
          this.unreadCount.set(Math.max(0, response.unreadCount || 0));
          return;
        }

        const response = await api.listNotifications(token, {
          nonLues: 'true',
          limit: 1,
        });
        this.unreadCount.set(Math.max(0, response.unreadCount || 0));
      } catch {
        this.unreadCount.set(0);
      }
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  setUnreadCount(value: number) {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    this.unreadCount.set(normalized);
  }
}
