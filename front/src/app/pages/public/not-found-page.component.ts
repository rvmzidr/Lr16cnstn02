import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SitePreferencesService } from '../../core/services/site-preferences.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-shell py-24">
      <div class="surface-card mx-auto max-w-2xl p-10 text-center">
        <div
          class="mb-3 text-sm uppercase tracking-[0.25em] text-muted-foreground"
        >
          404
        </div>
        <h1 class="text-5xl font-bold text-foreground">
          {{ site.localize(notFoundTitle) }}
        </h1>
        <p class="mt-4 text-lg text-muted-foreground">
          {{ site.localize(notFoundText) }}
        </p>
        <div class="mt-8">
          <a routerLink="/" class="btn-primary">{{
            site.localize(backHomeLabel)
          }}</a>
        </div>
      </div>
    </section>
  `,
})
export class NotFoundPageComponent {
  readonly site = inject(SitePreferencesService);
  readonly notFoundTitle = {
    fr: 'Page introuvable',
    en: 'Page not found',
    ar: 'الصفحة غير موجودة',
  };
  readonly notFoundText = {
    fr: 'Le contenu demandé n existe pas ou n est plus disponible.',
    en: 'The requested content does not exist or is no longer available.',
    ar: 'المحتوى المطلوب غير موجود أو لم يعد متاحًا.',
  };
  readonly backHomeLabel = {
    fr: 'Retour à l accueil',
    en: 'Back to home',
    ar: 'العودة إلى الرئيسية',
  };
}
