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
import type { MessagingUserSummary } from '../../../core/models/models';
import { SitePreferencesService } from '../../../core/services/site-preferences.service';
import { sharedIcons } from '../../lucide-icons';

@Component({
  selector: 'app-messaging-new-message',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="inline-flex rounded-xl border border-border bg-muted/30 p-1">
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition"
          [class.bg-card]="mode() === 'direct'"
          [class.text-foreground]="mode() === 'direct'"
          [class.text-muted-foreground]="mode() !== 'direct'"
          (click)="modeChange.emit('direct')"
        >
          {{ site.localize({ fr: 'Message direct', en: 'Direct message', ar: 'رسالة مباشرة' }) }}
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition"
          [class.bg-card]="mode() === 'group'"
          [class.text-foreground]="mode() === 'group'"
          [class.text-muted-foreground]="mode() !== 'group'"
          (click)="modeChange.emit('group')"
        >
          {{ site.localize({ fr: 'Groupe', en: 'Group', ar: 'مجموعة' }) }}
        </button>
      </div>

      @if (mode() === 'group') {
        <div class="grid gap-2">
          <input
            class="input-shell"
            [placeholder]="site.localize({ fr: 'Nom du groupe', en: 'Group name', ar: 'اسم المجموعة' })"
            [ngModel]="groupTitle()"
            (ngModelChange)="groupTitleChange.emit($event)"
          />
          <textarea
            class="textarea-shell"
            [placeholder]="site.localize({ fr: 'Description (optionnelle)', en: 'Description (optional)', ar: 'الوصف (اختياري)' })"
            [ngModel]="groupDescription()"
            (ngModelChange)="groupDescriptionChange.emit($event)"
          ></textarea>
        </div>
      }

      <div class="relative">
        <lucide-icon
          [img]="icons.Search"
          class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        ></lucide-icon>
        <input
          class="input-shell pl-11"
          [placeholder]="searchPlaceholder()"
          [ngModel]="recipientSearch()"
          (ngModelChange)="recipientSearchChange.emit($event)"
        />
      </div>

      @if (searchingRecipients()) {
        <p class="text-xs text-muted-foreground">{{ site.localize({ fr: 'Recherche des destinataires...', en: 'Searching recipients...', ar: 'جار البحث عن المستلمين...' }) }}</p>
      } @else {
        <div class="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
          @for (recipient of recipients(); track recipient.id) {
            <button
              type="button"
              class="w-full rounded-lg border bg-card px-3 py-2 text-left transition"
              [class.border-primary/40]="isSelected(recipient.id)"
              [class.border-border]="!isSelected(recipient.id)"
              [class.bg-primary/5]="isSelected(recipient.id)"
              (click)="toggleRecipient(recipient.id)"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-semibold text-foreground">{{ recipient.fullName }}</p>
                <span class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {{ recipient.role }}
                </span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">{{ recipient.email }}</p>
            </button>
          } @empty {
            <div class="px-3 py-4 text-sm text-muted-foreground">{{ site.localize({ fr: 'Aucun destinataire trouve.', en: 'No recipient found.', ar: 'لم يتم العثور على مستلم.' }) }}</div>
          }
        </div>
      }

      @if (mode() === 'group' && selectedRecipientIds().length) {
        <div class="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {{
            site.localize({
              fr: selectedRecipientIds().length + ' membre(s) selectionne(s)',
              en: selectedRecipientIds().length + ' selected member(s)',
              ar: selectedRecipientIds().length + ' عضو/أعضاء محددون',
            })
          }}
        </div>
      }
    </div>
  `,
})
export class MessagingNewMessageComponent {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly mode = input<'direct' | 'group'>('direct');
  readonly recipients = input<MessagingUserSummary[]>([]);
  readonly recipientSearch = input('');
  readonly selectedRecipientId = input('');
  readonly selectedRecipientIds = input<string[]>([]);
  readonly groupTitle = input('');
  readonly groupDescription = input('');
  readonly searchingRecipients = input(false);
  readonly searchPlaceholder = input('');

  readonly modeChange = output<'direct' | 'group'>();
  readonly recipientSearchChange = output<string>();
  readonly selectedRecipientChange = output<string>();
  readonly selectedRecipientsChange = output<string[]>();
  readonly groupTitleChange = output<string>();
  readonly groupDescriptionChange = output<string>();

  readonly selectedSet = computed(
    () => new Set(this.selectedRecipientIds()),
  );

  isSelected(recipientId: string) {
    if (this.mode() === 'direct') {
      return this.selectedRecipientId() === recipientId;
    }

    return this.selectedSet().has(recipientId);
  }

  toggleRecipient(recipientId: string) {
    if (this.mode() === 'direct') {
      this.selectedRecipientChange.emit(recipientId);
      return;
    }

    const current = new Set(this.selectedRecipientIds());
    if (current.has(recipientId)) {
      current.delete(recipientId);
    } else {
      current.add(recipientId);
    }

    this.selectedRecipientsChange.emit(Array.from(current));
  }
}
