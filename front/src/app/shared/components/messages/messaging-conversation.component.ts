import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { ConversationDetail, ConversationMessage } from '../../../core/models/models';
import { SitePreferencesService } from '../../../core/services/site-preferences.service';
import { MessageBubbleComponent } from './message-bubble.component';
import { sharedIcons } from '../../lucide-icons';

type RenderedConversationItem = {
  kind: 'date' | 'message';
  id: string;
  label?: string;
  message?: ConversationMessage;
};

@Component({
  selector: 'app-messaging-conversation',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, MessageBubbleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex h-full min-h-0 flex-col" (click)="closeMoreMenu()">
      @if (conversation(); as detail) {
        <header class="border-b border-border bg-muted/20 px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex items-center gap-3">
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
                (click)="backMobile.emit()"
                [attr.aria-label]="site.localize({ fr: 'Retour', en: 'Back', ar: 'رجوع' })"
              >
                <lucide-icon [img]="icons.ArrowLeft" class="h-4 w-4"></lucide-icon>
              </button>

              <div class="relative shrink-0">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {{ conversationInitial() }}
                </span>
                <span
                  class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
                  [class.bg-green-500]="isOnline()"
                  [class.bg-slate-400]="!isOnline()"
                ></span>
              </div>

              <div class="min-w-0">
                <h3 class="truncate text-base font-semibold text-foreground">
                  {{ conversationTitle() }}
                </h3>
                <p class="truncate text-sm text-muted-foreground">
                  {{ presenceLabel() }} · {{ roleLabel() }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                [attr.aria-label]="site.localize({ fr: 'Appel', en: 'Call', ar: 'اتصال' })"
                (click)="$event.stopPropagation()"
              >
                <lucide-icon [img]="icons.Phone" class="h-4 w-4"></lucide-icon>
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                [attr.aria-label]="site.localize({ fr: 'Visio', en: 'Video call', ar: 'مكالمة فيديو' })"
                (click)="$event.stopPropagation()"
              >
                <lucide-icon [img]="icons.Video" class="h-4 w-4"></lucide-icon>
              </button>

              <div class="relative" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  (click)="toggleMoreMenu($event)"
                  [attr.aria-label]="site.localize({ fr: 'Plus', en: 'More', ar: 'المزيد' })"
                >
                  <lucide-icon [img]="icons.MoreVertical" class="h-4 w-4"></lucide-icon>
                </button>

                @if (moreMenuOpen()) {
                  <div class="absolute right-0 top-9 z-30 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                    @if (detail.conversation.estGroupe) {
                      <button
                        type="button"
                        class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                        (click)="onLeaveAction($event)"
                      >
                        {{ site.localize({ fr: 'Quitter le groupe', en: 'Leave group', ar: 'مغادرة المجموعة' }) }}
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                        (click)="onArchiveAction($event)"
                      >
                        {{ site.localize({ fr: 'Archiver la conversation', en: 'Archive conversation', ar: 'أرشفة المحادثة' }) }}
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto bg-card px-4 py-4">
          @if (loading()) {
            <div class="px-3 py-8 text-center text-sm text-muted-foreground">
              {{ site.localize({ fr: 'Chargement des messages...', en: 'Loading messages...', ar: 'جار تحميل الرسائل...' }) }}
            </div>
          } @else {
            <div class="space-y-3">
              @for (item of renderedItems(); track item.id) {
                @if (item.kind === 'date') {
                  <div class="flex justify-center">
                    <span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {{ item.label }}
                    </span>
                  </div>
                } @else {
                  <app-message-bubble
                    [message]="item.message || null"
                    [own]="item.message?.expediteur?.id === currentUserId()"
                    [showSender]="detail.conversation.estGroupe && item.message?.expediteur?.id !== currentUserId()"
                    (openAttachment)="openAttachment.emit($event)"
                  ></app-message-bubble>
                }
              } @empty {
                <div class="px-3 py-8 text-center text-sm text-muted-foreground">
                  {{ site.localize({ fr: 'Aucun message pour le moment.', en: 'No messages yet.', ar: 'لا توجد رسائل حاليا.' }) }}
                </div>
              }
            </div>
          }
        </div>

        <form class="border-t border-border bg-muted/10 px-3 py-3" (ngSubmit)="send.emit()">
          <div class="flex items-end gap-2">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              [attr.aria-label]="site.localize({ fr: 'Emoji', en: 'Emoji', ar: 'رمز تعبيري' })"
            >
              <lucide-icon [img]="icons.Smile" class="h-4 w-4"></lucide-icon>
            </button>

            <label
              class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              [attr.aria-label]="site.localize({ fr: 'Piece jointe', en: 'Attachment', ar: 'مرفق' })"
            >
              <lucide-icon [img]="icons.Paperclip" class="h-4 w-4"></lucide-icon>
              <input type="file" class="hidden" (change)="attachmentSelected.emit($event)" />
            </label>

            <div class="min-w-0 flex-1">
              <input
                class="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
                [placeholder]="site.localize({ fr: 'Ecrire un message...', en: 'Write a message...', ar: 'اكتب رسالة...' })"
                [ngModel]="draft()"
                (ngModelChange)="draftChange.emit($event)"
                name="messageDraftInput"
                [disabled]="sending()"
              />

              @if (attachmentName()) {
                <p class="mt-1 truncate text-sm text-muted-foreground">
                  {{ site.localize({ fr: 'Piece jointe', en: 'Attachment', ar: 'مرفق' }) }}: {{ attachmentName() }}
                </p>
              }
            </div>

            <button
              type="submit"
              class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="sending() || !canSend()"
              [attr.aria-label]="site.localize({ fr: 'Envoyer', en: 'Send', ar: 'إرسال' })"
            >
              <lucide-icon [img]="icons.Send" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        </form>
      } @else {
        <div class="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <p>{{ site.localize({ fr: 'Selectionnez une conversation pour commencer.', en: 'Select a conversation to start.', ar: 'حدد محادثة للبدء.' }) }}</p>
        </div>
      }
    </section>
  `,
})
export class MessagingConversationComponent {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly conversation = input<ConversationDetail | null>(null);
  readonly currentUserId = input('');
  readonly draft = input('');
  readonly attachmentName = input('');
  readonly loading = input(false);
  readonly sending = input(false);

  readonly draftChange = output<string>();
  readonly send = output<void>();
  readonly attachmentSelected = output<Event>();
  readonly archiveConversation = output<void>();
  readonly leaveGroup = output<void>();
  readonly openAttachment = output<number>();
  readonly backMobile = output<void>();
  readonly moreMenuOpen = signal(false);

  readonly renderedItems = computed<RenderedConversationItem[]>(() => {
    const detail = this.conversation();
    if (!detail) {
      return [];
    }

    const items: RenderedConversationItem[] = [];
    let previousDateKey = '';

    for (const message of detail.messages || []) {
      const parsed = new Date(message.creeLe);
      const dateKey = Number.isNaN(parsed.getTime())
        ? message.creeLe
        : `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;

      if (dateKey !== previousDateKey) {
        items.push({
          kind: 'date',
          id: `date-${dateKey}`,
          label: this.formatDateLabel(parsed),
        });
        previousDateKey = dateKey;
      }

      items.push({
        kind: 'message',
        id: `message-${message.id}`,
        message,
      });
    }

    return items;
  });

  readonly canSend = computed(
    () => this.draft().trim().length > 0 || this.attachmentName().trim().length > 0,
  );

  readonly conversationTitle = computed(() => {
    const detail = this.conversation();
    if (!detail) {
      return this.site.localize({
        fr: 'Conversation',
        en: 'Conversation',
        ar: 'محادثة',
      });
    }

    if (detail.conversation.estGroupe) {
      return (
        detail.conversation.sujet ||
        this.site.localize({
          fr: 'Groupe sans titre',
          en: 'Untitled group',
          ar: 'مجموعة بدون عنوان',
        })
      );
    }

    const otherParticipant = (detail.participants || [])
      .map((participant) => participant.utilisateur)
      .find((utilisateur) => utilisateur?.id !== this.currentUserId());

    return (
      otherParticipant?.nomComplet ||
      this.site.localize({
        fr: 'Conversation directe',
        en: 'Direct conversation',
        ar: 'محادثة مباشرة',
      })
    );
  });

  readonly directPeer = computed(() => {
    const detail = this.conversation();
    if (!detail || detail.conversation.estGroupe) {
      return null;
    }

    return (detail.participants || [])
      .map((participant) => participant.utilisateur)
      .find((utilisateur) => utilisateur?.id !== this.currentUserId()) || null;
  });

  readonly conversationInitial = computed(() => {
    const title = this.conversationTitle();
    return title?.trim()?.charAt(0)?.toUpperCase() || '?';
  });

  readonly isOnline = computed(() => {
    const detail = this.conversation();
    if (!detail) {
      return false;
    }

    if (!detail.conversation.estGroupe) {
      return Boolean(this.directPeer()?.actif);
    }

    return (detail.participants || [])
      .map((participant) => participant.utilisateur)
      .filter((utilisateur) => utilisateur && utilisateur.id !== this.currentUserId())
      .some((utilisateur) => Boolean(utilisateur?.actif));
  });

  readonly presenceLabel = computed(() =>
    this.isOnline()
      ? this.site.localize({ fr: 'En ligne', en: 'Online', ar: 'متصل' })
      : this.site.localize({ fr: 'Hors ligne', en: 'Offline', ar: 'غير متصل' }),
  );

  readonly roleLabel = computed(() => {
    const detail = this.conversation();
    if (!detail) {
      return this.site.localize({
        fr: 'Participant',
        en: 'Participant',
        ar: 'مشارك',
      });
    }

    if (detail.conversation.estGroupe) {
      return this.site.localize({
        fr: 'Groupe',
        en: 'Group',
        ar: 'مجموعة',
      });
    }

    return (
      this.directPeer()?.role ||
      this.site.localize({ fr: 'Participant', en: 'Participant', ar: 'مشارك' })
    );
  });

  toggleMoreMenu(event: MouseEvent) {
    event.stopPropagation();
    this.moreMenuOpen.update((open) => !open);
  }

  closeMoreMenu() {
    if (this.moreMenuOpen()) {
      this.moreMenuOpen.set(false);
    }
  }

  onArchiveAction(event: MouseEvent) {
    event.stopPropagation();
    this.moreMenuOpen.set(false);
    this.archiveConversation.emit();
  }

  onLeaveAction(event: MouseEvent) {
    event.stopPropagation();
    this.moreMenuOpen.set(false);
    this.leaveGroup.emit();
  }

  private formatDateLabel(parsedDate: Date) {
    if (Number.isNaN(parsedDate.getTime())) {
      return this.site.localize({
        fr: 'Date inconnue',
        en: 'Unknown date',
        ar: 'تاريخ غير معروف',
      });
    }

    const now = new Date();
    const isSameDay =
      parsedDate.getDate() === now.getDate() &&
      parsedDate.getMonth() === now.getMonth() &&
      parsedDate.getFullYear() === now.getFullYear();

    if (isSameDay) {
      return this.site.localize({
        fr: "Aujourd'hui",
        en: 'Today',
        ar: 'اليوم',
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      parsedDate.getDate() === yesterday.getDate() &&
      parsedDate.getMonth() === yesterday.getMonth() &&
      parsedDate.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return this.site.localize({
        fr: 'Hier',
        en: 'Yesterday',
        ar: 'أمس',
      });
    }

    const locale =
      this.site.language() === 'ar'
        ? 'ar-MA'
        : this.site.language() === 'en'
          ? 'en-GB'
          : 'fr-FR';

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsedDate);
  }
}
