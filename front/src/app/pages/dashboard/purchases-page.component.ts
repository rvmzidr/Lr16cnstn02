import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-4xl font-bold text-foreground">Demandes d'achat</h2>
          <p class="text-lg text-muted-foreground">Le workflow d'achat sera active dans une evolution ulterieure</p>
        </div>
        <button class="btn-primary" disabled>Nouvelle demande</button>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        @for (tile of stats; track tile.label) {
          <div class="surface-card p-6">
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{{ tile.label }}</div>
            <div class="mt-4 text-4xl font-bold text-foreground">--</div>
            <div class="mt-2 text-sm text-muted-foreground">Point d'acces indisponible</div>
          </div>
        }
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon [img]="icons.Search" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input class="input-shell pl-11" placeholder="Rechercher par materiel ou demandeur..." disabled />
        </div>
      </div>

      <div class="surface-card p-8">
        <h3 class="text-2xl font-semibold text-foreground">Fonctionnalite non active</h3>
        <p class="mt-3 text-muted-foreground">
          Les demandes d'achat appartiennent a une evolution future de la plateforme.
        </p>
      </div>
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
