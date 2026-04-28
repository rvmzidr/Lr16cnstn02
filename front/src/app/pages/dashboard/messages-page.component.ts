import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type {
  ConversationDetail,
  ConversationSummary,
  MessagingUserSummary,
  Role,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { MessagingConversationComponent } from '../../shared/components/messages/messaging-conversation.component';
import { MessagingInboxComponent } from '../../shared/components/messages/messaging-inbox.component';
import { MessagingNewMessageComponent } from '../../shared/components/messages/messaging-new-message.component';
import { sharedIcons } from '../../shared/lucide-icons';
import { MessagesService } from '../../shared/services/messages.service';

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    MessagingInboxComponent,
    MessagingConversationComponent,
    MessagingNewMessageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <section class="app-page-hero">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">{{ site.localize(messagesEyebrow) }}</p>

          <div class="app-page-header mt-2">
            <div class="space-y-1.5">
              <h2 class="app-page-title">{{ site.localize(messagesTitle) }}</h2>
              <p class="app-page-description">{{ site.localize(messagesDescription) }}</p>
            </div>

            <button type="button" class="btn-secondary min-h-11 shrink-0 px-5" (click)="openNewMessageModal()">
              <lucide-icon [img]="icons.MessagesSquare" class="h-4 w-4"></lucide-icon>
              {{ site.localize(newMessageLabel) }}
            </button>
          </div>

          <div class="app-page-pills">
            <span class="app-page-pill">
              {{
                site.localize({
                  fr: unreadCount() + ' message(s) non lu(s)',
                  en: unreadCount() + ' unread message(s)',
                  ar: unreadCount() + ' رسالة/رسائل غير مقروءة',
                })
              }}
            </span>
          </div>
        </div>
      </section>

      <div class="h-[calc(100vh-220px)] min-h-[30rem] overflow-hidden rounded-xl border border-border bg-card">
        <div class="grid h-full md:grid-cols-3">
          <div class="h-full md:col-span-1 md:block" [class.hidden]="showMobileChat()">
            <app-messaging-inbox
              [conversations]="conversations()"
              [selectedConversationId]="selectedConversationId()"
              [currentUserId]="currentUserId()"
              [search]="search()"
              [loading]="loadingInbox()"
              [searchPlaceholder]="site.localize(searchPlaceholder)"
              (searchChange)="search.set($event)"
              (selectConversation)="onSelectConversation($event)"
            ></app-messaging-inbox>
          </div>

          <div
            class="h-full border-t border-border md:col-span-2 md:block md:border-l md:border-t-0"
            [class.hidden]="!showMobileChat()"
          >
            <app-messaging-conversation
              [conversation]="selectedConversation()"
              [currentUserId]="currentUserId()"
              [draft]="messageDraft()"
              [attachmentName]="attachmentName()"
              [loading]="loadingConversation()"
              [sending]="sending()"
              (draftChange)="messageDraft.set($event)"
              (attachmentSelected)="onAttachmentSelected($event)"
              (openAttachment)="openMessageAttachment($event)"
              (archiveConversation)="archiveSelectedConversation()"
              (leaveGroup)="leaveSelectedConversationGroup()"
              (backMobile)="showConversationListMobile()"
              (send)="sendMessage()"
            ></app-messaging-conversation>
          </div>
        </div>
      </div>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }

      @if (showNewMessageModal()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4" (click)="closeNewMessageModal()">
          <div class="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-elevated" (click)="$event.stopPropagation()">
            <div class="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-foreground">{{ site.localize(newMessageModalTitle) }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ site.localize(newMessageModalDescription) }}
                </p>
              </div>
              <button type="button" class="btn-outline" (click)="closeNewMessageModal()">
                {{ site.localize(closeLabel) }}
              </button>
            </div>

            <app-messaging-new-message
              [mode]="newMessageMode()"
              [recipients]="recipients()"
              [recipientSearch]="recipientSearch()"
              [selectedRecipientId]="draftRecipientId()"
              [selectedRecipientIds]="draftRecipientIds()"
              [groupTitle]="draftGroupTitle()"
              [groupDescription]="draftGroupDescription()"
              [searchingRecipients]="loadingRecipients()"
              [searchPlaceholder]="site.localize(recipientSearchPlaceholder)"
              (modeChange)="onNewMessageModeChange($event)"
              (recipientSearchChange)="onRecipientSearchChange($event)"
              (selectedRecipientChange)="onDraftRecipientChange($event)"
              (selectedRecipientsChange)="onDraftRecipientsChange($event)"
              (groupTitleChange)="draftGroupTitle.set($event)"
              (groupDescriptionChange)="draftGroupDescription.set($event)"
            ></app-messaging-new-message>

            <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" class="btn-outline" (click)="closeNewMessageModal()">
                {{ site.localize(cancelLabel) }}
              </button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="!canConfirmConversationCreation()"
                (click)="confirmConversationCreation()"
              >
                {{ site.localize(openConversationLabel) }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MessagesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly messagesApi = inject(MessagesService);
  readonly icons = sharedIcons;

  readonly conversations = signal<ConversationSummary[]>([]);
  readonly selectedConversation = signal<ConversationDetail | null>(null);
  readonly selectedConversationId = signal<number | null>(null);
  readonly search = signal('');
  readonly recipientSearch = signal('');
  readonly recipients = signal<MessagingUserSummary[]>([]);
  readonly draftRecipientId = signal('');
  readonly draftRecipientIds = signal<string[]>([]);
  readonly draftGroupTitle = signal('');
  readonly draftGroupDescription = signal('');
  readonly newMessageMode = signal<'direct' | 'group'>('direct');
  readonly messageDraft = signal('');
  readonly selectedAttachment = signal<File | null>(null);
  readonly attachmentName = signal('');
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly showNewMessageModal = signal(false);
  readonly loadingInbox = signal(false);
  readonly loadingConversation = signal(false);
  readonly loadingRecipients = signal(false);
  readonly sending = signal(false);
  readonly showMobileChat = signal(false);

  readonly unreadCount = this.messagesApi.unreadCount;
  readonly currentUserId = computed(() => this.auth.session()?.utilisateur?.id || '');
  readonly currentRole = computed<Role | null>(
    () => this.auth.session()?.utilisateur?.role || null,
  );
  readonly canCreateGroup = computed(() => {
    const role = this.currentRole();
    return role === 'CHEF_LABO' || role === 'ADMINISTRATEUR';
  });
  readonly canConfirmConversationCreation = computed(() => {
    if (this.newMessageMode() === 'direct') {
      return Boolean(this.draftRecipientId());
    }

    return (
      this.canCreateGroup() &&
      this.draftGroupTitle().trim().length > 0 &&
      this.draftRecipientIds().length >= 2
    );
  });

  readonly messagesTitle = { fr: 'Messagerie', en: 'Messaging', ar: 'الرسائل' };
  readonly messagesEyebrow = {
    fr: 'Communication interne',
    en: 'Internal communication',
    ar: 'التواصل الداخلي',
  };
  readonly messagesDescription = {
    fr: 'Conversations directes et groupes avec historique persistant, notifications et pieces jointes.',
    en: 'Direct and group conversations with persistent history, notifications, and attachments.',
    ar: 'محادثات مباشرة وجماعية مع سجل دائم وإشعارات ومرفقات.',
  };
  readonly newMessageLabel = {
    fr: 'Nouveau message',
    en: 'New message',
    ar: 'رسالة جديدة',
  };
  readonly newMessageModalTitle = {
    fr: 'Nouvelle conversation',
    en: 'New conversation',
    ar: 'محادثة جديدة',
  };
  readonly newMessageModalDescription = {
    fr: 'Choisissez un message direct ou creez un groupe en selectionnant plusieurs destinataires.',
    en: 'Choose direct messaging or create a group by selecting multiple recipients.',
    ar: 'اختر رسالة مباشرة أو أنشئ مجموعة بتحديد عدة مستلمين.',
  };
  readonly openConversationLabel = {
    fr: 'Creer / Ouvrir',
    en: 'Create / Open',
    ar: 'إنشاء / فتح',
  };
  readonly closeLabel = {
    fr: 'Fermer',
    en: 'Close',
    ar: 'إغلاق',
  };
  readonly cancelLabel = {
    fr: 'Annuler',
    en: 'Cancel',
    ar: 'إلغاء',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher une conversation...',
    en: 'Search conversations...',
    ar: 'ابحث في المحادثات...',
  };
  readonly recipientSearchPlaceholder = {
    fr: 'Rechercher un destinataire...',
    en: 'Search recipients...',
    ar: 'ابحث عن مستلم...',
  };

  private recipientsRequestId = 0;

  async ngOnInit() {
    try {
      await Promise.all([
        this.loadConversations({ keepSelection: true }),
        this.refreshRecipients(''),
      ]);

      const preferredConversationId = Number(
        this.route.snapshot.queryParamMap.get('conversationId') || 0,
      );
      if (preferredConversationId > 0) {
        await this.selectConversation(preferredConversationId, {
          clearQueryParams: true,
          refreshInboxAfterOpen: true,
          openOnMobile: true,
        });
        return;
      }

      const preferredUserId = this.route.snapshot.queryParamMap.get('user') || '';
      if (preferredUserId) {
        await this.openOrCreateDirectConversation(preferredUserId, {
          clearQueryParams: true,
          openOnMobile: true,
        });
        return;
      }

      const firstConversationId = this.conversations()[0]?.id;
      if (firstConversationId) {
        await this.selectConversation(firstConversationId, {
          refreshInboxAfterOpen: true,
        });
      }
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Erreur messagerie.',
            en: 'Messaging error.',
            ar: 'خطأ في المراسلة.',
          }),
        ),
      );
    }
  }

  async loadConversations(options: { keepSelection?: boolean } = {}) {
    this.loadingInbox.set(true);

    try {
      const items = await this.messagesApi.listConversations();
      this.conversations.set(items);

      if (!options.keepSelection) {
        this.selectedConversationId.set(null);
        this.selectedConversation.set(null);
        return;
      }

      const selectedId = this.selectedConversationId();
      if (selectedId && !items.some((item) => item.id === selectedId)) {
        this.selectedConversationId.set(null);
        this.selectedConversation.set(null);
      }
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Chargement des conversations impossible.',
            en: 'Unable to load conversations.',
            ar: 'تعذر تحميل المحادثات.',
          }),
        ),
      );
    } finally {
      this.loadingInbox.set(false);
    }
  }

  async onSelectConversation(conversationId: number) {
    await this.selectConversation(conversationId, {
      clearQueryParams: true,
      refreshInboxAfterOpen: true,
      openOnMobile: true,
    });
  }

  async selectConversation(
    conversationId: number,
    options: {
      clearQueryParams?: boolean;
      refreshInboxAfterOpen?: boolean;
      openOnMobile?: boolean;
    } = {},
  ) {
    if (!conversationId) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');
    this.loadingConversation.set(true);
    this.selectedConversationId.set(conversationId);

    try {
      const detail = await this.messagesApi.getConversation(conversationId);
      this.selectedConversation.set(detail);

      if (options.openOnMobile) {
        this.showMobileChat.set(true);
      }

      if (options.refreshInboxAfterOpen) {
        await this.loadConversations({ keepSelection: true });
      }

      if (
        options.clearQueryParams &&
        (this.route.snapshot.queryParamMap.get('conversationId') ||
          this.route.snapshot.queryParamMap.get('user'))
      ) {
        await this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { conversationId: null, user: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Conversation introuvable.',
            en: 'Conversation not found.',
            ar: 'المحادثة غير موجودة.',
          }),
        ),
      );
    } finally {
      this.loadingConversation.set(false);
    }
  }

  async sendMessage() {
    const conversationId = this.selectedConversationId();
    const content = this.messageDraft().trim();
    const attachment = this.selectedAttachment();

    if (!conversationId) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Selectionnez une conversation avant envoi.',
          en: 'Select a conversation before sending.',
          ar: 'حدد محادثة قبل الإرسال.',
        }),
      );
      return;
    }

    if (!content && !attachment) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Le message doit contenir un texte ou une piece jointe.',
          en: 'Message must contain text or an attachment.',
          ar: 'يجب أن تحتوي الرسالة على نص أو مرفق.',
        }),
      );
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');
    this.sending.set(true);

    try {
      await this.messagesApi.sendMessage({
        conversationId,
        content,
        attachment,
      });

      this.messageDraft.set('');
      this.selectedAttachment.set(null);
      this.attachmentName.set('');

      await this.selectConversation(conversationId, {
        refreshInboxAfterOpen: true,
        openOnMobile: this.showMobileChat(),
      });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Message envoye.',
          en: 'Message sent.',
          ar: 'تم إرسال الرسالة.',
        }),
      );
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Envoi impossible.',
            en: 'Unable to send message.',
            ar: 'تعذر إرسال الرسالة.',
          }),
        ),
      );
    } finally {
      this.sending.set(false);
    }
  }

  onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedAttachment.set(file);
    this.attachmentName.set(file?.name || '');
  }

  async openMessageAttachment(attachmentId: number) {
    try {
      await this.messagesApi.downloadMessageAttachment(attachmentId);
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Ouverture de la piece jointe impossible.',
            en: 'Unable to open attachment.',
            ar: 'تعذر فتح المرفق.',
          }),
        ),
      );
    }
  }

  async onRecipientSearchChange(value: string) {
    this.recipientSearch.set(value);
    await this.refreshRecipients(value);
  }

  async refreshRecipients(searchValue: string) {
    const requestId = ++this.recipientsRequestId;
    this.loadingRecipients.set(true);

    try {
      const items = await this.messagesApi.searchRecipients(searchValue, 20);

      if (requestId !== this.recipientsRequestId) {
        return;
      }

      this.recipients.set(items);
    } catch (error) {
      if (requestId !== this.recipientsRequestId) {
        return;
      }

      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Recherche destinataires impossible.',
            en: 'Unable to search recipients.',
            ar: 'تعذر البحث عن المستلمين.',
          }),
        ),
      );
    } finally {
      if (requestId === this.recipientsRequestId) {
        this.loadingRecipients.set(false);
      }
    }
  }

  openNewMessageModal() {
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.showNewMessageModal.set(true);
    this.newMessageMode.set('direct');
    this.recipientSearch.set('');
    this.draftRecipientId.set('');
    this.draftRecipientIds.set([]);
    this.draftGroupTitle.set('');
    this.draftGroupDescription.set('');
    void this.refreshRecipients('');
  }

  closeNewMessageModal() {
    this.showNewMessageModal.set(false);
  }

  showConversationListMobile() {
    this.showMobileChat.set(false);
  }

  onNewMessageModeChange(mode: 'direct' | 'group') {
    this.newMessageMode.set(mode);
    this.errorMessage.set('');

    if (mode === 'direct') {
      this.draftRecipientIds.set([]);
      this.draftGroupTitle.set('');
      this.draftGroupDescription.set('');
      return;
    }

    this.draftRecipientId.set('');
  }

  onDraftRecipientChange(userId: string) {
    this.draftRecipientId.set(userId);
  }

  onDraftRecipientsChange(userIds: string[]) {
    this.draftRecipientIds.set(userIds);
  }

  async confirmConversationCreation() {
    if (!this.canConfirmConversationCreation()) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Veuillez completer les informations requises.',
          en: 'Please complete the required information.',
          ar: 'يرجى إكمال المعلومات المطلوبة.',
        }),
      );
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      if (this.newMessageMode() === 'direct') {
        const recipientId = this.draftRecipientId();
        const detail = await this.messagesApi.createDirectConversation({
          recipientId,
        });

        this.closeNewMessageModal();
        await this.loadConversations({ keepSelection: true });
        await this.selectConversation(detail.conversation.id, {
          refreshInboxAfterOpen: true,
          clearQueryParams: true,
          openOnMobile: true,
        });
        return;
      }

      const detail = await this.messagesApi.createGroupConversation({
        sujet: this.draftGroupTitle().trim(),
        description: this.draftGroupDescription().trim() || undefined,
        participantIds: this.draftRecipientIds(),
      });

      this.closeNewMessageModal();
      await this.loadConversations({ keepSelection: true });
      await this.selectConversation(detail.conversation.id, {
        refreshInboxAfterOpen: true,
        clearQueryParams: true,
        openOnMobile: true,
      });
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Creation de conversation impossible.',
            en: 'Unable to create conversation.',
            ar: 'تعذر إنشاء المحادثة.',
          }),
        ),
      );
    }
  }

  async archiveSelectedConversation() {
    const detail = this.selectedConversation();
    const conversationId = this.selectedConversationId();

    if (!detail || !conversationId || detail.conversation.estGroupe) {
      return;
    }

    try {
      await this.messagesApi.archiveConversation(conversationId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Conversation archivee.',
          en: 'Conversation archived.',
          ar: 'تمت أرشفة المحادثة.',
        }),
      );
      this.selectedConversationId.set(null);
      this.selectedConversation.set(null);
      this.showMobileChat.set(false);
      await this.loadConversations({ keepSelection: false });

      const firstConversationId = this.conversations()[0]?.id;
      if (firstConversationId) {
        await this.selectConversation(firstConversationId, {
          refreshInboxAfterOpen: true,
        });
      }
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Archivage impossible.',
            en: 'Unable to archive conversation.',
            ar: 'تعذر أرشفة المحادثة.',
          }),
        ),
      );
    }
  }

  async leaveSelectedConversationGroup() {
    const detail = this.selectedConversation();
    const conversationId = this.selectedConversationId();

    if (!detail || !conversationId || !detail.conversation.estGroupe) {
      return;
    }

    try {
      await this.messagesApi.leaveGroupConversation(conversationId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Vous avez quitte le groupe.',
          en: 'You left the group.',
          ar: 'لقد غادرت المجموعة.',
        }),
      );
      this.selectedConversationId.set(null);
      this.selectedConversation.set(null);
      this.showMobileChat.set(false);
      await this.loadConversations({ keepSelection: false });

      const firstConversationId = this.conversations()[0]?.id;
      if (firstConversationId) {
        await this.selectConversation(firstConversationId, {
          refreshInboxAfterOpen: true,
        });
      }
    } catch (error) {
      this.errorMessage.set(
        this.getReadableError(
          error,
          this.site.localize({
            fr: 'Operation impossible.',
            en: 'Operation failed.',
            ar: 'تعذر تنفيذ العملية.',
          }),
        ),
      );
    }
  }

  private async openOrCreateDirectConversation(
    targetUserId: string,
    options: { clearQueryParams?: boolean; openOnMobile?: boolean } = {},
  ) {
    const detail = await this.messagesApi.createDirectConversation({
      recipientId: targetUserId,
    });

    await this.loadConversations({ keepSelection: true });
    await this.selectConversation(detail.conversation.id, {
      clearQueryParams: options.clearQueryParams,
      refreshInboxAfterOpen: true,
      openOnMobile: options.openOnMobile,
    });
  }

  private getReadableError(error: unknown, fallback: string) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
