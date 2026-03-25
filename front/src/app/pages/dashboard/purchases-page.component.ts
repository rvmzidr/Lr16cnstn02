import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Demandes d'achat</h2>
          <p class="app-page-description">Le workflow d'achat sera active dans une evolution ulterieure.</p>
        </div>
        <button class="btn-primary" disabled>Nouvelle demande</button>
      </div>

      <div class="app-kpi-grid">
        @for (tile of stats; track tile.label) {
          <div class="app-kpi-card">
            <div class="app-kpi-card__label">{{ tile.label }}</div>
            <div class="app-kpi-card__value">--</div>
            <div class="app-kpi-card__meta">Point d'acces indisponible</div>
          </div>
        }
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon [img]="icons.Search" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input class="input-shell pl-11" placeholder="Rechercher par materiel ou demandeur..." disabled />
        </div>
      </div>

      <div class="empty-state">Les demandes d'achat appartiennent a une evolution future de la plateforme.</div>
    </div>
  `
})
export class PurchasesPageComponent {
  readonly icons = sharedIcons;
  readonly stats = [
    { label: 'Demandes en attente' },
    { label: 'Validees ce mois-ci' },
    { label: 'Budget total' }
  ];
}
