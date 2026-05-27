import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <lucide-icon name="shield-alert" class="w-12 h-12 text-red-600"></lucide-icon>
      </div>
      <h1 class="text-3xl font-bold text-foreground tracking-tight mb-2">Accès Refusé</h1>
      <p class="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
        Vous n'avez pas les autorisations nécessaires pour accéder à cette page. Veuillez contacter l'administrateur si vous pensez qu'il s'agit d'une erreur.
      </p>
      <a routerLink="/dashboard" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6 py-2 gap-2">
        <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
        Retourner à l'accueil
      </a>
    </div>
  `,
})
export class UnauthorizedPageComponent {}
