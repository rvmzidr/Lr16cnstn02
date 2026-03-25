import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Messagerie</h2>
          <p class="app-page-description">La messagerie complete sera activee dans une evolution ulterieure.</p>
        </div>
        <button class="btn-primary" disabled>
          <lucide-icon [img]="icons.Send" class="h-4 w-4"></lucide-icon>
          Nouveau message
        </button>
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon [img]="icons.Search" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input class="input-shell pl-11" placeholder="Rechercher un message..." disabled />
        </div>
      </div>

      <div class="empty-state">La messagerie complete est reservee aux evolutions ulterieures.</div>
    </div>
  `
})
export class MessagesPageComponent {
  readonly icons = sharedIcons;
}
