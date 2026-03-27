import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(purchasesTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(purchasesDescription) }}
          </p>
        </div>
        <button class="btn-primary" disabled>
          {{ site.localize(newRequestLabel) }}
        </button>
      </div>

      <div class="app-kpi-grid">
        @for (tile of stats; track tile.label) {
          <div class="app-kpi-card">
            <div class="app-kpi-card__label">{{ tile.label }}</div>
            <div class="app-kpi-card__value">--</div>
            <div class="app-kpi-card__meta">
              {{ site.localize(accessUnavailableLabel) }}
            </div>
          </div>
        }
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
export class PurchasesPageComponent {
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly purchasesTitle = {
    fr: 'Demandes d achat',
    en: 'Purchase requests',
    ar: 'طلبات الشراء',
  };
  readonly purchasesDescription = {
    fr: 'Le workflow d achat sera activé dans une évolution ultérieure.',
    en: 'The purchase workflow will be enabled in a future release.',
    ar: 'سيتم تفعيل مسار الشراء في إصدار لاحق.',
  };
  readonly newRequestLabel = {
    fr: 'Nouvelle demande',
    en: 'New request',
    ar: 'طلب جديد',
  };
  readonly accessUnavailableLabel = {
    fr: 'Point d accès indisponible',
    en: 'Access point unavailable',
    ar: 'نقطة الوصول غير متاحة',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher par matériel ou demandeur...',
    en: 'Search by equipment or requester...',
    ar: 'ابحث حسب المعدّات أو مقدم الطلب...',
  };
  readonly emptyLabel = {
    fr: 'Les demandes d achat appartiennent à une évolution future de la plateforme.',
    en: 'Purchase requests belong to a future platform evolution.',
    ar: 'طلبات الشراء جزء من تطوير مستقبلي للمنصة.',
  };
  readonly stats = [
    {
      label: this.site.localize({
        fr: 'Demandes en attente',
        en: 'Pending requests',
        ar: 'طلبات معلقة',
      }),
    },
    {
      label: this.site.localize({
        fr: 'Validées ce mois-ci',
        en: 'Validated this month',
        ar: 'طلبات معتمدة هذا الشهر',
      }),
    },
    {
      label: this.site.localize({
        fr: 'Budget total',
        en: 'Total budget',
        ar: 'الميزانية الإجمالية',
      }),
    },
  ];
}
