import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { ConversationMessage } from '../../../core/models/models';
import { SitePreferencesService } from '../../../core/services/site-preferences.service';
import { sharedIcons } from '../../lucide-icons';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as item) {
      <div class="flex" [class.justify-end]="own()">
        <article
          class="max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm"
          [class.rounded-br-md]="own()"
          [class.bg-primary]="own()"
          [class.text-primary-foreground]="own()"
          [class.rounded-bl-md]="!own()"
          [class.bg-muted]="!own()"
          [class.text-foreground]="!own()"
        >
          @if (showSender()) {
            <p
              class="text-xs font-semibold uppercase tracking-[0.14em]"
              [class.text-primary-foreground/80]="own()"
              [class.text-muted-foreground]="!own()"
            >
                {{ item.expediteur?.nomComplet || site.localize({ fr: 'Expediteur', en: 'Sender', ar: 'المرسل' }) }}
            </p>
          }

          <p class="mt-1 whitespace-pre-line text-sm leading-relaxed">
            {{ item.contenu }}
          </p>

          @if (item.pieceJointe) {
            <button
              type="button"
              class="mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition"
              [class.border-primary-foreground/20]="own()"
              [class.bg-primary-foreground/10]="own()"
              [class.text-primary-foreground]="own()"
              [class.border-border]="!own()"
              [class.bg-background]="!own()"
              [class.text-foreground]="!own()"
              (click)="openAttachment.emit(item.pieceJointe.id)"
            >
              <span class="truncate">{{ item.pieceJointe.nomFichier }}</span>
              <span class="shrink-0 text-xs" [class.text-primary-foreground/80]="own()" [class.text-muted-foreground]="!own()">
                {{ site.localize({ fr: 'Ouvrir', en: 'Open', ar: 'فتح' }) }}
              </span>
            </button>
          }

          <div
            class="mt-1.5 flex items-center justify-end gap-1.5 text-xs"
            [class.text-primary-foreground/75]="own()"
            [class.text-muted-foreground]="!own()"
          >
            <span>{{ formatTime(item.creeLe) }}</span>
            @if (own()) {
              @if (item.lu) {
                <lucide-icon [img]="icons.CheckCheck" class="h-3.5 w-3.5 text-blue-500"></lucide-icon>
              } @else {
                <lucide-icon [img]="icons.Check" class="h-3.5 w-3.5 text-slate-400"></lucide-icon>
              }
            }
          </div>
        </article>
      </div>
    }
  `,
})
export class MessageBubbleComponent {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly message = input<ConversationMessage | null>(null);
  readonly own = input(false);
  readonly showSender = input(false);
  readonly openAttachment = output<number>();

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
