import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import type { Actualite } from '../../core/models/models';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-member-news-page',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-4xl font-bold text-foreground">
          {{ site.localize(memberNewsTitle) }}
        </h2>
        <p class="text-lg text-muted-foreground">
          {{ site.localize(memberNewsIntro) }}
        </p>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        @for (item of news(); track item.id) {
          <div class="surface-card p-7">
            <div class="badge-soft">{{ item.statut }}</div>
            <h3 class="mt-4 text-3xl font-bold text-foreground">
              {{ item.titre }}
            </h3>
            <p class="mt-4 text-lg leading-8 text-muted-foreground">
              {{ item.resume || item.contenu }}
            </p>
            <div class="mt-6 text-sm text-muted-foreground">
              {{ formatDate(item.publieeLe || item.creeLe) }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MemberNewsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly news = signal<Actualite[]>([]);
  readonly formatDate = formatDate;
  readonly memberNewsTitle = {
    fr: 'Actualités membres',
    en: 'Member news',
    ar: 'أخبار الأعضاء',
  };
  readonly memberNewsIntro = {
    fr: 'Consultez le flux interne récent du laboratoire.',
    en: 'Consult the recent internal laboratory feed.',
    ar: 'اطلع على آخر التدفق الداخلي للمختبر.',
  };

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const response = await api.listMemberNews(token, { limit: 20 });
      this.news.set(response.elements);
    } catch {
      this.news.set([]);
    }
  }
}
