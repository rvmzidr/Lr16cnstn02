import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-shell py-24">
      <div class="surface-card mx-auto max-w-2xl p-10 text-center">
        <div class="mb-3 text-sm uppercase tracking-[0.25em] text-muted-foreground">404</div>
        <h1 class="text-5xl font-bold text-foreground">Page introuvable</h1>
        <p class="mt-4 text-lg text-muted-foreground">
          Le contenu demande n'existe pas ou n'est plus disponible.
        </p>
        <div class="mt-8">
          <a routerLink="/" class="btn-primary">Retour a l'accueil</a>
        </div>
      </div>
    </section>
  `
})
export class NotFoundPageComponent {}
