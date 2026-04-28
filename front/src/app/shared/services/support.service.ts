import { Injectable, computed, inject } from '@angular/core';
import type {
  SupportTicketDetail,
  SupportTicketStats,
  SupportTicketStatus,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';

export type SupportTicketFilters = {
  q?: string;
  statut?: SupportTicketStatus | '';
  categorie?:
    | 'LOGIN'
    | 'ACCOUNT'
    | 'ACCESS'
    | 'ROLE'
    | 'MODULE_VISIBILITY'
    | 'PERMISSION'
    | 'UI_BUG'
    | 'TRANSLATION'
    | 'MESSAGING'
    | 'NOTIFICATIONS'
    | 'ARTICLES'
    | 'SYSTEM'
    | 'OTHER'
    | '';
  priorite?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | '';
  assignation?: 'all' | 'assigned' | 'unassigned' | 'mine' | '';
  page?: number;
  limit?: number;
};

@Injectable({ providedIn: 'root' })
export class SupportService {
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

  private buildReplyPayload(options: {
    message?: string;
    attachment?: File | null;
    estNoteInterne?: boolean;
    rouvrirTicket?: boolean;
  }) {
    const content = options.message?.trim();

    if (options.attachment) {
      const payload = new FormData();
      if (content) {
        payload.set('message', content);
      }
      payload.set('pieceJointe', options.attachment);

      if (options.estNoteInterne !== undefined) {
        payload.set('estNoteInterne', String(options.estNoteInterne));
      }

      if (options.rouvrirTicket !== undefined) {
        payload.set('rouvrirTicket', String(options.rouvrirTicket));
      }

      return payload;
    }

    return {
      message: content || undefined,
      estNoteInterne: options.estNoteInterne,
      rouvrirTicket: options.rouvrirTicket,
    };
  }

  private buildCreatePayload(options: {
    sujet: string;
    categorie:
      | 'LOGIN'
      | 'ACCOUNT'
      | 'ACCESS'
      | 'ROLE'
      | 'MODULE_VISIBILITY'
      | 'PERMISSION'
      | 'UI_BUG'
      | 'TRANSLATION'
      | 'MESSAGING'
      | 'NOTIFICATIONS'
      | 'ARTICLES'
      | 'SYSTEM'
      | 'OTHER';
    priorite: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    description: string;
    attachment?: File | null;
  }) {
    if (options.attachment) {
      const payload = new FormData();
      payload.set('sujet', options.sujet.trim());
      payload.set('categorie', options.categorie);
      payload.set('priorite', options.priorite);
      payload.set('description', options.description.trim());
      payload.set('pieceJointe', options.attachment);
      return payload;
    }

    return {
      sujet: options.sujet.trim(),
      categorie: options.categorie,
      priorite: options.priorite,
      description: options.description.trim(),
    };
  }

  async listTickets(filters: SupportTicketFilters = {}) {
    const token = this.ensureToken();

    if (this.isAdmin()) {
      const result = await api.listAdminSupportTickets(token, {
        q: filters.q,
        statut: filters.statut,
        categorie: filters.categorie,
        priorite: filters.priorite,
        assignation: filters.assignation,
        page: filters.page,
        limit: filters.limit,
      });

      return result;
    }

    return api.listMySupportTickets(token, {
      q: filters.q,
      statut: filters.statut,
      categorie: filters.categorie,
      priorite: filters.priorite,
      page: filters.page,
      limit: filters.limit,
    });
  }

  async getTicketDetail(ticketId: number) {
    const token = this.ensureToken();

    if (this.isAdmin()) {
      return api.getAdminSupportTicketDetail(token, ticketId);
    }

    return api.getMySupportTicketDetail(token, ticketId);
  }

  async getAdminStats() {
    const token = this.ensureToken();

    if (!this.isAdmin()) {
      return {
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        total: 0,
      } as SupportTicketStats;
    }

    return api.getAdminSupportStats(token);
  }

  async createTicket(options: {
    sujet: string;
    categorie:
      | 'LOGIN'
      | 'ACCOUNT'
      | 'ACCESS'
      | 'ROLE'
      | 'MODULE_VISIBILITY'
      | 'PERMISSION'
      | 'UI_BUG'
      | 'TRANSLATION'
      | 'MESSAGING'
      | 'NOTIFICATIONS'
      | 'ARTICLES'
      | 'SYSTEM'
      | 'OTHER';
    priorite: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    description: string;
    attachment?: File | null;
  }) {
    const token = this.ensureToken();
    const payload = this.buildCreatePayload(options);
    return api.createSupportTicket(token, payload);
  }

  async addReplyAsRequester(options: {
    ticketId: number;
    message?: string;
    attachment?: File | null;
    rouvrirTicket?: boolean;
  }) {
    const token = this.ensureToken();
    const payload = this.buildReplyPayload(options);
    return api.createSupportTicketReply(token, options.ticketId, payload);
  }

  async addReplyAsAdmin(options: {
    ticketId: number;
    message?: string;
    attachment?: File | null;
    estNoteInterne?: boolean;
  }) {
    const token = this.ensureToken();
    const payload = this.buildReplyPayload(options);
    return api.createAdminSupportTicketReply(token, options.ticketId, payload);
  }

  async assignTicket(ticketId: number, adminId?: string) {
    const token = this.ensureToken();
    return api.assignAdminSupportTicket(token, ticketId, { adminId });
  }

  async updateStatus(ticketId: number, statut: SupportTicketStatus) {
    const token = this.ensureToken();
    return api.updateAdminSupportTicketStatus(token, ticketId, { statut });
  }

  async uploadAttachment(ticketId: number, file: File) {
    const token = this.ensureToken();
    return api.uploadSupportTicketAttachment(token, ticketId, file);
  }

  async downloadAttachment(attachmentId: number) {
    const token = this.ensureToken();
    return api.downloadSupportAttachment(token, attachmentId);
  }

  async getTicketAccessDiagnostic(ticketId: number) {
    const token = this.ensureToken();

    if (!this.isAdmin()) {
      throw new Error('Acces reserve aux administrateurs.');
    }

    return api.getAdminSupportTicketAccessContext(token, ticketId);
  }

  async resolveTicketAccess(
    ticketId: number,
    payload: {
      assignProfileId?: number;
      replace?: boolean;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
      notes?: string;
      responseMessage?: string;
      closeTicket?: boolean;
    },
  ) {
    const token = this.ensureToken();

    if (!this.isAdmin()) {
      throw new Error('Acces reserve aux administrateurs.');
    }

    return api.resolveAdminSupportTicketAccess(token, ticketId, payload);
  }

  currentUserId() {
    return this.auth.session()?.utilisateur?.id || '';
  }

  currentUserRole() {
    return this.auth.session()?.utilisateur?.role || null;
  }

  currentUserDisplayName() {
    return this.auth.session()?.utilisateur?.nomComplet || '';
  }
}
