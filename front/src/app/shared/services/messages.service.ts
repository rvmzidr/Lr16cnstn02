import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ConversationDetail,
  ConversationSummary,
  MessagingUserSummary,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly auth = inject(AuthService);
  readonly unreadCount = signal(0);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  private ensureToken() {
    if (!this.token) {
      throw new Error('Utilisateur non authentifie.');
    }

    return this.token;
  }

  private buildMessagePayload(content?: string, attachment?: File | null) {
    if (attachment) {
      const formData = new FormData();
      if (content && content.trim()) {
        formData.set('contenu', content.trim());
      }
      formData.set('pieceJointe', attachment);
      return formData;
    }

    return {
      contenu: content?.trim() || undefined,
    };
  }

  async listConversations() {
    const token = this.ensureToken();
    const result = await api.listConversations(token);
    const sorted = this.sortConversationsByLatest(result.elements || []);
    await this.refreshUnreadCount(sorted);
    return sorted;
  }

  async getConversation(conversationId: number) {
    const token = this.ensureToken();
    return api.getConversation(token, conversationId);
  }

  async createDirectConversation(options: {
    recipientId: string;
    content?: string;
    attachment?: File | null;
  }) {
    const token = this.ensureToken();
    const payload = this.buildMessagePayload(options.content, options.attachment);

    if (payload instanceof FormData) {
      payload.set('participantIds', JSON.stringify([options.recipientId]));
    }

    const body =
      payload instanceof FormData
        ? payload
        : {
            participantIds: [options.recipientId],
            contenu: payload.contenu,
          };

    const result = await api.createConversation(token, body);
    return result;
  }

  async createGroupConversation(options: {
    sujet: string;
    participantIds: string[];
    description?: string;
    content?: string;
    attachment?: File | null;
  }) {
    const token = this.ensureToken();
    const payload = this.buildMessagePayload(options.content, options.attachment);

    if (payload instanceof FormData) {
      payload.set('sujet', options.sujet.trim());
      if (options.description?.trim()) {
        payload.set('description', options.description.trim());
      }
      payload.set('participantIds', JSON.stringify(options.participantIds));

      return api.createGroupConversation(token, payload);
    }

    return api.createGroupConversation(token, {
      sujet: options.sujet.trim(),
      description: options.description?.trim() || undefined,
      participantIds: options.participantIds,
      contenu: payload.contenu,
    });
  }

  async sendMessage(options: {
    conversationId: number;
    content?: string;
    attachment?: File | null;
  }) {
    const token = this.ensureToken();
    const payload = this.buildMessagePayload(options.content, options.attachment);
    const result = await api.sendMessage(token, options.conversationId, payload);
    return result;
  }

  async markMessageRead(messageId: number) {
    const token = this.ensureToken();
    const result = await api.markMessageRead(token, messageId);
    return result;
  }

  async archiveConversation(conversationId: number) {
    const token = this.ensureToken();
    return api.archiveConversation(token, conversationId);
  }

  async unarchiveConversation(conversationId: number) {
    const token = this.ensureToken();
    return api.unarchiveConversation(token, conversationId);
  }

  async leaveGroupConversation(conversationId: number) {
    const token = this.ensureToken();
    return api.leaveGroupConversation(token, conversationId);
  }

  async addGroupMembers(conversationId: number, participantIds: string[]) {
    const token = this.ensureToken();
    return api.addGroupMembers(token, conversationId, { participantIds });
  }

  async removeGroupMember(conversationId: number, userId: string) {
    const token = this.ensureToken();
    return api.removeGroupMember(token, conversationId, userId);
  }

  async downloadMessageAttachment(attachmentId: number) {
    const token = this.ensureToken();
    return api.downloadMessageAttachment(token, attachmentId);
  }

  async refreshUnreadCount(conversations?: ConversationSummary[]) {
    let items = conversations;

    if (!items) {
      items = await this.listConversations();
    }

    const total = (items || []).reduce(
      (sum, item) => sum + (item.unreadCount || 0),
      0,
    );

    this.unreadCount.set(total);
    return total;
  }

  async searchRecipients(search: string, limit = 20) {
    const token = this.ensureToken();
    const result = await api.searchMessageRecipients(token, {
      search,
      limit,
    });
    return result.elements || [];
  }

  sortConversationsByLatest(conversations: ConversationSummary[]) {
    return [...conversations].sort((a, b) => {
      const aTime = a.dernierMessage?.creeLe
        ? new Date(a.dernierMessage.creeLe).getTime()
        : new Date(a.modifieLe || a.creeLe).getTime();
      const bTime = b.dernierMessage?.creeLe
        ? new Date(b.dernierMessage.creeLe).getTime()
        : new Date(b.modifieLe || b.creeLe).getTime();
      return bTime - aTime;
    });
  }
}
