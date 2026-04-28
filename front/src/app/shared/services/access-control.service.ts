import { Injectable, computed, inject } from '@angular/core';
import type { Role } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';

export type AccessProfilesFilters = {
  q?: string;
  roleParent?: Role;
  active?: boolean;
  page?: number;
  limit?: number;
};

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly auth = inject(AuthService);

  readonly isAdmin = computed(
    () => this.auth.session()?.utilisateur?.role === 'ADMINISTRATEUR',
  );

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  private ensureToken() {
    if (!this.token) {
      throw new Error('Utilisateur non authentifie.');
    }

    return this.token;
  }

  async listProfiles(filters: AccessProfilesFilters = {}) {
    const token = this.ensureToken();

    return api.listAdminAccessProfiles(token, {
      q: filters.q,
      roleParent: filters.roleParent,
      active: filters.active === undefined ? undefined : String(filters.active),
      page: filters.page,
      limit: filters.limit,
    });
  }

  async createProfile(payload: {
    name: string;
    description?: string;
    roleParent: Role;
    isActive?: boolean;
    defaultLandingPage?: string;
    allowedLanguages?: Array<'fr' | 'en' | 'ar'>;
    defaultLanguage?: 'fr' | 'en' | 'ar';
    rtlArabic?: boolean;
    modules?: Array<{ moduleKey: string; isVisible: boolean }>;
    permissions?: Array<{ permissionKey: string; isAllowed: boolean }>;
    widgets?: Array<{ widgetKey: string; isVisible: boolean }>;
  }) {
    const token = this.ensureToken();
    return api.createAdminAccessProfile(token, payload);
  }

  async getProfileDetail(profileId: number) {
    const token = this.ensureToken();
    return api.getAdminAccessProfileDetail(token, profileId);
  }

  async getUserAccessSummary() {
    const token = this.ensureToken();
    return api.getAdminUserAccessSummary(token);
  }

  async listUserAccessUsers(filters: {
    q?: string;
    role?: Role;
    isDoctorant?: boolean;
    hasOverrides?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const token = this.ensureToken();

    return api.listAdminUserAccessUsers(token, {
      q: filters.q,
      role: filters.role,
      isDoctorant:
        filters.isDoctorant === undefined ? undefined : String(filters.isDoctorant),
      hasOverrides:
        filters.hasOverrides === undefined ? undefined : String(filters.hasOverrides),
      page: filters.page,
      limit: filters.limit,
    });
  }

  async getUserAccessContextV2(userId: string) {
    const token = this.ensureToken();
    return api.getAdminUserAccessContextV2(token, userId);
  }

  async updateUserAccess(
    userId: string,
    payload: {
      replace?: boolean;
      resetToDefault?: boolean;
      defaultLandingPage?: string | null;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
    },
  ) {
    const token = this.ensureToken();
    return api.updateAdminUserAccess(token, userId, payload);
  }

  async resetUserAccess(userId: string) {
    const token = this.ensureToken();
    return api.resetAdminUserAccess(token, userId);
  }

  async updateProfile(
    profileId: number,
    payload: {
      name?: string;
      description?: string;
      roleParent?: Role;
      isActive?: boolean;
      defaultLandingPage?: string;
      allowedLanguages?: Array<'fr' | 'en' | 'ar'>;
      defaultLanguage?: 'fr' | 'en' | 'ar';
      rtlArabic?: boolean;
      modules?: Array<{ moduleKey: string; isVisible: boolean }>;
      permissions?: Array<{ permissionKey: string; isAllowed: boolean }>;
      widgets?: Array<{ widgetKey: string; isVisible: boolean }>;
    },
  ) {
    const token = this.ensureToken();
    return api.updateAdminAccessProfile(token, profileId, payload);
  }

  async duplicateProfile(profileId: number) {
    const token = this.ensureToken();
    return api.duplicateAdminAccessProfile(token, profileId);
  }

  async updateProfileStatus(profileId: number, isActive: boolean) {
    const token = this.ensureToken();
    return api.updateAdminAccessProfileStatus(token, profileId, { isActive });
  }

  async listProfileUsers(profileId: number, query?: { q?: string; page?: number; limit?: number }) {
    const token = this.ensureToken();
    return api.listAdminAccessProfileUsers(token, profileId, {
      q: query?.q,
      page: query?.page,
      limit: query?.limit,
    });
  }

  async assignProfileToUser(userId: string, profileId: number) {
    const token = this.ensureToken();
    return api.assignAdminUserAccessProfile(token, userId, { profileId });
  }

  async getUserAccessContext(userId: string) {
    const token = this.ensureToken();
    return api.getAdminUserAccessContext(token, userId);
  }

  async updateUserOverrides(
    userId: string,
    payload: {
      replace?: boolean;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
    },
  ) {
    const token = this.ensureToken();
    return api.updateAdminUserAccessOverrides(token, userId, payload);
  }

  async previewProfile(profileId: number) {
    const token = this.ensureToken();
    return api.previewAdminAccessProfile(token, profileId);
  }

  async previewUser(userId: string) {
    const token = this.ensureToken();
    return api.previewAdminAccessUser(token, userId);
  }

  async getSupportTicketAccessContext(ticketId: number) {
    const token = this.ensureToken();
    return api.getAdminSupportTicketAccessContext(token, ticketId);
  }

  async resolveSupportTicketAccess(
    ticketId: number,
    payload: {
      replace?: boolean;
      resetToDefault?: boolean;
      defaultLandingPage?: string | null;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
      notes?: string;
      responseMessage?: string;
      closeTicket?: boolean;
    },
  ) {
    const token = this.ensureToken();
    return api.resolveAdminSupportTicketAccess(token, ticketId, payload);
  }

  async searchUsersForAssignment(query: string) {
    const token = this.ensureToken();
    const response = await api.listAdminAccounts(token, {
      q: query,
      page: 1,
      limit: 50,
    });

    return response.comptes;
  }

  async getMyAccessContext() {
    const token = this.ensureToken();
    return api.getMyAccessContext(token);
  }
}
