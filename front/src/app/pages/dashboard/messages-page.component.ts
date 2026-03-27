import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(messagesTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(messagesDescription) }}
          </p>
        </div>
        <button class="btn-primary" disabled>
          <lucide-icon [img]="icons.Send" class="h-4 w-4"></lucide-icon>
          {{ site.localize(newMessageLabel) }}
        </button>
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon
            [img]="icons.Search"
            class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          ></lucide-icon>
          <input
            class="input-shell pl-11"
            [placeholder]="site.localize(searchPlaceholder)"
            disabled
          />
        </div>
      </div>

      <div class="empty-state">{{ site.localize(emptyLabel) }}</div>
    </div>
  `,
})
export class MessagesPageComponent {
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly messagesTitle = { fr: 'Messagerie', en: 'Messaging', ar: 'الرسائل' };
  readonly messagesDescription = {
    fr: 'La messagerie complète sera activée dans une évolution ultérieure.',
    en: 'Full messaging will be enabled in a later release.',
    ar: 'سيتم تفعيل نظام الرسائل الكامل في إصدار لاحق.',
  };
  readonly newMessageLabel = {
    fr: 'Nouveau message',
    en: 'New message',
    ar: 'رسالة جديدة',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un message...',
    en: 'Search a message...',
    ar: 'ابحث عن رسالة...',
  };
  readonly emptyLabel = {
    fr: 'La messagerie complète est réservée aux évolutions ultérieures.',
    en: 'Full messaging is reserved for future releases.',
    ar: 'نظام الرسائل الكامل مخصص للإصدارات القادمة.',
  };
}
