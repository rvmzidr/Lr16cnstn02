import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { ContactData } from '../core/models/models';
import { api } from '../core/services/api';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner--light surface-card px-8 py-12 lg:px-12">
        <div class="max-w-5xl space-y-6">
          <div class="tag-chip">Contact</div>
          <h1 class="text-5xl font-bold text-foreground lg:text-7xl">Contact</h1>
          <p class="text-xl leading-9 text-muted-foreground">
            Ecrivez au laboratoire LR16CNSTN02 pour toute demande d'information ou de suivi.
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="grid gap-8 lg:grid-cols-2">
        <div class="surface-card p-8">
          <h2 class="text-3xl font-bold text-foreground">Coordonnees du laboratoire</h2>
          <p class="mt-2 text-lg text-muted-foreground">Informations publiques de reference</p>
          <div class="mt-8 space-y-6">
            <div class="flex gap-4">
              <lucide-icon [img]="icons.Mail" class="mt-1 h-5 w-5 text-primary"></lucide-icon>
              <div><div class="font-semibold">Email</div><div class="text-lg text-muted-foreground">{{ contact()?.email || 'contact@lr16cnstn02.tn' }}</div></div>
            </div>
            <div class="flex gap-4">
              <lucide-icon [img]="icons.Phone" class="mt-1 h-5 w-5 text-primary"></lucide-icon>
              <div><div class="font-semibold">Telephone</div><div class="text-lg text-muted-foreground">{{ contact()?.telephone || '+216 71 000 000' }}</div></div>
            </div>
            <div class="flex gap-4">
              <lucide-icon [img]="icons.MapPin" class="mt-1 h-5 w-5 text-primary"></lucide-icon>
              <div><div class="font-semibold">Adresse</div><div class="text-lg leading-8 text-muted-foreground">{{ contact()?.adresse || 'Centre National des Sciences et Technologies Nucleaires, Tunis, Tunisie' }}</div></div>
            </div>
          </div>
          <div class="surface-muted mt-8 p-6">
            <div class="text-2xl font-semibold text-foreground">{{ contact()?.institution?.nom || 'Centre National des Sciences et Technologies Nucleaires' }}</div>
            <div class="mt-4 text-lg text-muted-foreground">{{ contact()?.horaires || 'Lundi au vendredi, 08:30 - 16:30' }}</div>
          </div>
        </div>

        <div class="surface-card p-8">
          <h2 class="text-3xl font-bold text-foreground">Formulaire de contact</h2>
          <p class="mt-2 text-lg text-muted-foreground">Le message est stocke dans la plateforme pour traitement par l'equipe.</p>
          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div><label class="mb-2 block font-semibold">Nom complet</label><input [(ngModel)]="form.nomComplet" name="nomComplet" class="input-shell" required /></div>
            <div><label class="mb-2 block font-semibold">Email</label><input [(ngModel)]="form.email" name="email" type="email" class="input-shell" required /></div>
            <div><label class="mb-2 block font-semibold">Sujet</label><input [(ngModel)]="form.sujet" name="sujet" class="input-shell" required /></div>
            <div><label class="mb-2 block font-semibold">Message</label><textarea [(ngModel)]="form.message" name="message" class="textarea-shell" required></textarea></div>
            @if (successMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ successMessage() }}</div> }
            @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
            <button type="submit" class="btn-secondary" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Envoi...' : 'Envoyer le message' }}</button>
          </form>
        </div>
      </div>
    </section>
  `
})
export class ContactPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly contact = signal<ContactData | null>(null);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly form = { nomComplet: '', email: '', sujet: '', message: '' };

  async ngOnInit() {
    try {
      this.contact.set(await api.getContact());
    } catch {
      this.contact.set(null);
    }
  }

  async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await api.submitContact(this.form);
      this.successMessage.set('Votre message a bien ete enregistre.');
      this.form.nomComplet = '';
      this.form.email = '';
      this.form.sujet = '';
      this.form.message = '';
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de l\'envoi.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
