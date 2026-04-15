import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { ConversationSummary } from '../../../core/models/models';
import { SitePreferencesService } from '../../../core/services/site-preferences.service';
import { sharedIcons } from '../../lucide-icons';

@Component({
  selector: 'app-messaging-inbox',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex h-full min-h-0 flex-col">
      <div class="px-4 pb-3 pt-4">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {{ site.localize({ fr: 'Conversations', en: 'Conversations', ar: 'المحادثات' }) }}
        </h3>
      </div>

      <div class="px-4 pb-3">
        <div class="relative rounded-xl bg-muted/30">
        <lucide-icon
          [img]="icons.Search"
          class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        ></lucide-icon>
        <input
          class="h-10 w-full rounded-xl border border-transparent bg-transparent pl-10 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-border focus:bg-background"
          [placeholder]="searchPlaceholder()"
          [ngModel]="search()"
          (ngModelChange)="searchChange.emit($event)"
        />

        @if (search().trim().length > 0) {
          <button
            type="button"
            class="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            (click)="searchChange.emit('')"
            [attr.aria-label]="site.localize({ fr: 'Effacer la recherche', en: 'Clear search', ar: 'مسح البحث' })"
          >
            <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
          </button>
        }
        </div>
      </div>

      <div class="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        @if (loading()) {
          <div class="px-3 py-8 text-center text-sm text-muted-foreground">
            {{ site.localize({ fr: 'Chargement des conversations...', en: 'Loading conversations...', ar: 'جار تحميل المحادثات...' }) }}
          </div>
        } @else {
          @for (conversation of filteredConversations(); track conversation.id) {
            <button
              type="button"
              class="group w-full rounded-lg border-l-2 px-3 py-3 text-left transition"
              [class.border-l-primary]="selectedConversationId() === conversation.id"
              [class.border-l-transparent]="selectedConversationId() !== conversation.id"
              [class.bg-primary/5]="selectedConversationId() === conversation.id"
              [class.hover:bg-muted/50]="selectedConversationId() !== conversation.id"
              (click)="selectConversation.emit(conversation.id)"
            >
              <div class="flex items-start gap-3">
                <div class="relative shrink-0">
                  <span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {{ conversationInitial(conversation) }}
                  </span>
                  @if (isOnline(conversation)) {
                    <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500"></span>
                  }
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="truncate text-sm font-semibold text-foreground">
                      {{ conversationTitle(conversation) }}
                    </p>
                    <span
                      class="shrink-0 text-sm"
                      [class.font-semibold]="conversation.unreadCount > 0"
                      [class.text-primary]="conversation.unreadCount > 0"
                      [class.text-muted-foreground]="conversation.unreadCount === 0"
                    >
                      {{ formatTime(conversation.dernierMessage?.creeLe || conversation.modifieLe) }}
                    </span>
                  </div>

                  <div class="mt-1 flex items-center justify-between gap-2">
                    <p class="truncate text-sm text-muted-foreground">
                      {{ conversationPreview(conversation) }}
                    </p>
                    @if (conversation.unreadCount > 0) {
                      <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {{ conversation.unreadCount > 9 ? '9+' : conversation.unreadCount }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            </button>
          } @empty {
            <div class="px-3 py-8 text-center text-sm text-muted-foreground">
              {{ site.localize({ fr: 'Aucune conversation.', en: 'No conversations.', ar: 'لا توجد محادثات.' }) }}
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class MessagingInboxComponent {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly conversations = input<ConversationSummary[]>([]);
  readonly selectedConversationId = input<number | null>(null);
  readonly currentUserId = input('');
  readonly search = input('');
  readonly loading = input(false);
  readonly searchPlaceholder = input('');

  readonly searchChange = output<string>();
  readonly selectConversation = output<number>();

  readonly filteredConversations = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) {
      return this.conversations();
    }

    return this.conversations().filter((item) => {
      const title = this.conversationTitle(item).toLowerCase();
      const role = this.conversationRole(item).toLowerCase();
      const content = this.conversationPreview(item).toLowerCase();
      return title.includes(q) || role.includes(q) || content.includes(q);
    });
  });

  conversationInitial(conversation: ConversationSummary) {
    const title = this.conversationTitle(conversation);
    return title?.trim()?.charAt(0)?.toUpperCase() || '?';
  }

  isOnline(conversation: ConversationSummary) {
    const others = (conversation.participants || []).filter(
      (participant) => participant && participant.id !== this.currentUserId(),
    );

    if (!others.length) {
      return false;
    }

    return others.some((participant) => Boolean(participant?.actif));
  }

  conversationTitle(conversation: ConversationSummary) {
    if (conversation.estGroupe) {
      return (
        conversation.sujet ||
        this.site.localize({
          fr: 'Groupe sans titre',
          en: 'Untitled group',
          ar: 'مجموعة بدون عنوان',
        })
      );
    }

    const other = (conversation.participants || []).find(
      (participant) => participant && participant.id !== this.currentUserId(),
    );
    return (
      other?.nomComplet ||
      this.site.localize({
        fr: 'Conversation directe',
        en: 'Direct conversation',
        ar: 'محادثة مباشرة',
      })
    );
  }

  conversationRole(conversation: ConversationSummary) {
    if (conversation.estGroupe) {
      return this.site.localize({
        fr: `${conversation.participants?.length || 0} participant(s)`,
        en: `${conversation.participants?.length || 0} participant(s)`,
        ar: `${conversation.participants?.length || 0} مشارك/مشاركين`,
      });
    }

    const other = (conversation.participants || []).find(
      (participant) => participant && participant.id !== this.currentUserId(),
    );
    return (
      other?.role ||
      this.site.localize({ fr: 'Participant', en: 'Participant', ar: 'مشارك' })
    );
  }

  conversationPreview(conversation: ConversationSummary) {
    const latest = conversation.dernierMessage;
    if (!latest) {
      return this.site.localize({
        fr: 'Aucun message.',
        en: 'No messages.',
        ar: 'لا توجد رسائل.',
      });
    }

    if (latest.pieceJointe && !latest.contenu?.trim()) {
      return this.site.localize({
        fr: 'Piece jointe',
        en: 'Attachment',
        ar: 'مرفق',
      });
    }

    if (latest.pieceJointe) {
      return this.site.localize({
        fr: `${latest.contenu} • Piece jointe`,
        en: `${latest.contenu} • Attachment`,
        ar: `${latest.contenu} • مرفق`,
      });
    }

    return latest.contenu;
  }

  formatTime(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '--:--';
    }

    const locale =
      this.site.language() === 'ar'
        ? 'ar-MA'
        : this.site.language() === 'en'
          ? 'en-GB'
          : 'fr-FR';

    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }
}
