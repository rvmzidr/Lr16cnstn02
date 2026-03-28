import { Component, OnInit, computed, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../../shared/lucide-icons';
import type {
  RegistrationPayload,
  RegistrationReferences,
} from '../../core/models/models';
import {
  appendRegistrationPayloadToFormData,
  createEmptyRegistrationPayload,
  validateRegistrationPayload,
  type DossierErrorMap,
} from '../../core/member/dossier';
import { api } from '../../core/services/api';

type RegistrationStep = {
  id:
    | 'identite'
    | 'contact'
    | 'professionnel'
    | 'laboratoire'
    | 'doctorat'
    | 'securite';
  title: string;
};

@Component({
  selector: 'app-registration-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="flex min-h-[85vh] items-center justify-center py-12 px-6">
      <div
        class="animate-scale-in relative w-full max-w-[1200px] overflow-hidden rounded-[2.5rem] bg-card text-card-foreground shadow-2xl border border-secondary/10 flex flex-col md:flex-row"
      >
        <!-- Image Section -->
        <div
          class="hidden md:flex w-1/3 relative bg-primary/5 p-12 flex-col justify-center overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-primary/80 z-10 mix-blend-multiply"
          ></div>
          <img
            src="assets/nucl.jpg"
            class="absolute inset-0 w-full h-full object-cover"
          />
          <div class="relative z-20 text-white animate-fade-in-left delay-200">
            <div
              class="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-8 shadow-xl"
            >
              <lucide-icon
                [img]="icons.Users"
                class="w-8 h-8 text-secondary"
              ></lucide-icon>
            </div>
            <h2 class="text-3xl font-extrabold mb-4 font-serif leading-tight">
              Rejoindre <br /><span class="text-primary">l'Équipe.</span>
            </h2>
            <p class="text-white/80 leading-relaxed font-light mb-8 text-sm">
              Inscrivez-vous pour accéder au panel des chercheurs et aux
              ressources du laboratoire.
            </p>
          </div>
        </div>

        <!-- Form Section -->
        <div
          class="w-full md:w-2/3 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar glass-card"
        >
          <div
            class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8"
          >
            <div class="max-w-2xl">
              <h1
                class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl animate-fade-in-up font-serif"
              >
                {{
                  site.localize({
                    fr: 'Inscription',
                    en: 'Registration',
                    ar: 'تسجيل',
                  })
                }}
              </h1>
              <p
                class="mt-3 text-sm text-muted-foreground animate-fade-in-up delay-100"
              >
                Créez votre compte pour soumettre vos travaux et participer à la
                vie du laboratoire.
              </p>
            </div>

            <div
              class="rounded-2xl border border-border bg-slate-50 px-5 py-4 lg:min-w-[15rem] animate-fade-in-up delay-200"
            >
              <div
                class="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1"
              >
                Progression
              </div>
              <div class="text-2xl font-black text-primary font-serif">
                {{ currentStepIndex() + 1 }} / {{ steps.length }}
              </div>
              <div class="mt-1 text-xs font-semibold text-slate-600">
                {{ steps[currentStepIndex()].title }}
              </div>
            </div>
          </div>

          <div
            class="progress-track bg-slate-100 h-2 rounded-full overflow-hidden mb-10 animate-fade-in-up delay-300"
          >
            <div
              class="progress-fill h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 rounded-full"
              [style.width.%]="((currentStepIndex() + 1) / steps.length) * 100"
            ></div>
          </div>

          <form
            class="space-y-6 animate-fade-in-up delay-400"
            (ngSubmit)="submit()"
          >
            <div class="form-wrapper">
              <ng-container *ngTemplateOutlet="formContent"></ng-container>
            </div>

            @if (errorMessage()) {
              <div
                class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-3"
              >
                {{ errorMessage() }}
              </div>
            }

            <div
              class="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-8"
            >
              <button
                type="button"
                [disabled]="currentStepIndex() === 0 || isSubmitting()"
                (click)="prevStep()"
                class="rounded-xl border-2 border-slate-100 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-slate-600 transition-all hover:-translate-y-1 hover:border-slate-300 hover:text-slate-800 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Précédent
              </button>

              @if (currentStepIndex() === steps.length - 1) {
                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="rounded-xl bg-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-primary/90 hover:shadow-primary/30 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {{ isSubmitting() ? 'Enregistrement...' : 'Soumettre' }}
                </button>
              } @else {
                <button
                  type="button"
                  (click)="nextStep()"
                  class="rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-black disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  Suivant
                </button>
              }
            </div>

            <div class="mt-8 text-center pt-4 border-t border-slate-100">
              <a
                routerLink="/connexion"
                class="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
                >Déjà un compte ? Se connecter</a
              >
            </div>
          </form>
        </div>
      </div>
    </div>

    <ng-template #formContent>
      @switch (steps[currentStepIndex()].id) {
        @case ('identite') {
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Nom</label
              >
              <input
                [(ngModel)]="form.nom"
                name="nom"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Prenom</label
              >
              <input
                [(ngModel)]="form.prenom"
                name="prenom"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Nom de jeune fille</label
              >
              <input
                [(ngModel)]="form.nomJeuneFille"
                name="nomJeuneFille"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Sexe</label
              >
              <select
                [(ngModel)]="form.sexe"
                name="sexe"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              >
                <option value="FEMME">Feminin</option>
                <option value="HOMME">Masculin</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Date de naissance</label
              >
              <input
                [(ngModel)]="form.dateNaissance"
                name="dateNaissance"
                type="date"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Lieu de naissance</label
              >
              <input
                [(ngModel)]="form.lieuNaissance"
                name="lieuNaissance"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >CIN tunisien</label
              >
              <input
                [(ngModel)]="form.cin"
                name="cin"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Passeport</label
              >
              <input
                [(ngModel)]="form.passeport"
                name="passeport"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
        }
        @case ('contact') {
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Email institutionnel</label
              >
              <input
                [(ngModel)]="form.emailInstitutionnel"
                name="emailInstitutionnel"
                type="email"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Telephone</label
              >
              <input
                [(ngModel)]="form.telephone"
                name="telephone"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div class="md:col-span-2">
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Adresse</label
              >
              <textarea
                [(ngModel)]="form.adresse"
                name="adresse"
                rows="3"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              ></textarea>
            </div>
          </div>
        }
        @case ('professionnel') {
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Grade</label
              >
              <input
                [(ngModel)]="form.grade"
                name="grade"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >ORCID</label
              >
              <input
                [(ngModel)]="form.orcid"
                name="orcid"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div class="md:col-span-2">
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Institution d'affectation</label
              >
              <input
                [(ngModel)]="form.institutionAffectation"
                name="institutionAffectation"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
        }
        @case ('laboratoire') {
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Type de membre</label
              >
              <select
                [(ngModel)]="form.type"
                name="type"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              >
                <option value="CHERCHEUR">Chercheur</option>
                <option value="DOCTORANT">Doctorant</option>
                <option value="POST_DOC">Post-Doc</option>
                <option value="STAGIAIRE">Stagiaire</option>
                <option value="MEMBRE_ASSOCIE">Membre Associé</option>
                <option value="PERSONNEL_APPUI">Personnel d'Appui</option>
                <option value="ADMINISTRATEUR">Administrateur</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Sujet de recherche (ou rôle)</label
              >
              <textarea
                [(ngModel)]="form.sujetRecherche"
                name="sujetRecherche"
                rows="3"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              ></textarea>
            </div>
          </div>
        }
        @case ('doctorat') {
          <div class="grid gap-5 md:grid-cols-2">
            <div class="md:col-span-2">
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Date de première inscription (doctorants)</label
              >
              <input
                [(ngModel)]="form.datePremiereInscription"
                name="datePremiereInscription"
                type="date"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
        }
        @case ('securite') {
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Mot de passe</label
              >
              <input
                [(ngModel)]="form.motDePasse"
                name="motDePasse"
                type="password"
                required
                minlength="8"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Confirmer mot de passe</label
              >
              <input
                [(ngModel)]="motDePasseConfirm"
                name="motDePasseConfirm"
                type="password"
                required
                minlength="8"
                class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 px-4 py-3 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
        }
      }
    </ng-template>
  `,
})
export class RegistrationPageComponent implements OnInit {
  icons = sharedIcons;
  readonly references = signal<RegistrationReferences | null>(null);
  readonly currentStepIndex = signal(0);
  readonly errors = signal<DossierErrorMap>({});
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly isSubmitting = signal(false);
  readonly selectedFileName = signal('');
  attestationFile: File | null = null;
  form: RegistrationPayload = createEmptyRegistrationPayload();

  readonly steps: RegistrationStep[] = [
    { id: 'identite', title: 'Identite' },
    { id: 'contact', title: 'Contact' },
    { id: 'professionnel', title: 'Informations professionnelles' },
    { id: 'laboratoire', title: 'Informations laboratoire' },
    { id: 'doctorat', title: 'Doctorat' },
    { id: 'securite', title: 'Securite du compte' },
  ];

  readonly visibleErrors = computed(
    () => Object.values(this.errors()).filter(Boolean) as string[],
  );

  async ngOnInit() {
    try {
      const response = await api.getRegistrationReferences();
      this.references.set(response.references);
      this.form = createEmptyRegistrationPayload(
        response.references.laboratoireParDefaut,
      );
    } catch {
      this.references.set(null);
    }
  }

  handleAttestationChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.attestationFile = input.files?.[0] || null;
    this.selectedFileName.set(this.attestationFile?.name || '');
  }

  nextStep() {
    this.currentStepIndex.update((value) =>
      Math.min(value + 1, this.steps.length - 1),
    );
  }

  previousStep() {
    this.currentStepIndex.update((value) => Math.max(value - 1, 0));
  }

  async submit() {
    this.errorMessage.set('');
    this.successMessage.set('');
    const errors = validateRegistrationPayload(this.form, {
      mode: 'registration',
      hasExistingAttestation: Boolean(this.attestationFile),
    });
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = new FormData();
      appendRegistrationPayloadToFormData(payload, this.form, {
        includeAccountFields: true,
      });
      if (this.attestationFile) {
        payload.set('attestationDoctorant', this.attestationFile);
      }
      await api.register(payload);
      this.successMessage.set(
        'Votre inscription a ete enregistree. Elle sera validee par un administrateur.',
      );
      this.form = createEmptyRegistrationPayload(
        this.references()?.laboratoireParDefaut,
      );
      this.attestationFile = null;
      this.selectedFileName.set('');
      this.currentStepIndex.set(0);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'inscription.",
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
