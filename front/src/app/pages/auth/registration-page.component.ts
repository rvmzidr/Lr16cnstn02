
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { RegistrationPayload, RegistrationReferences } from '../../core/models/models';
import { appendRegistrationPayloadToFormData, createEmptyRegistrationPayload, validateRegistrationPayload, type DossierErrorMap } from '../../core/member/dossier';
import { api } from '../../core/services/api';

type RegistrationStep = {
  id: 'identite' | 'contact' | 'professionnel' | 'laboratoire' | 'doctorat' | 'securite';
  title: string;
};

@Component({
  selector: 'app-registration-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner surface-card px-8 py-10 lg:px-12">
        <div class="max-w-5xl space-y-4">
          <div class="tag-chip border-white/20 bg-white/8 text-white/80">Inscription</div>
          <h1 class="text-5xl font-bold text-white lg:text-6xl">Acces a la plateforme du laboratoire</h1>
          <p class="text-xl leading-9 text-white/80">
            Le role demande est fixe a "Membre". Toute inscription est creee avec le statut EN_ATTENTE.
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="surface-card p-8">
        <div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="text-xl font-semibold text-foreground">Etape {{ currentStepIndex() + 1 }} / {{ steps.length }}</div>
            <div class="text-lg text-muted-foreground">{{ steps[currentStepIndex()].title }}</div>
          </div>
          <div class="text-sm text-muted-foreground">Le formulaire s'affiche section par section.</div>
        </div>
        <div class="progress-track"><div class="progress-fill" [style.width.%]="((currentStepIndex() + 1) / steps.length) * 100"></div></div>
      </div>
    </section>

    <section class="page-shell pb-16">
      <div class="surface-card p-8">
        <form class="space-y-6" (ngSubmit)="submit()">
          @switch (steps[currentStepIndex()].id) {
            @case ('identite') {
              <div class="grid gap-5 md:grid-cols-2">
                <div><label class="mb-2 block font-semibold">Nom</label><input [(ngModel)]="form.nom" name="nom" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Prenom</label><input [(ngModel)]="form.prenom" name="prenom" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Nom de jeune fille</label><input [(ngModel)]="form.nomJeuneFille" name="nomJeuneFille" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Sexe</label><select [(ngModel)]="form.sexe" name="sexe" class="select-shell"><option value="FEMME">Feminin</option><option value="HOMME">Masculin</option><option value="AUTRE">Autre</option></select></div>
                <div><label class="mb-2 block font-semibold">Date de naissance</label><input [(ngModel)]="form.dateNaissance" name="dateNaissance" type="date" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Lieu de naissance</label><input [(ngModel)]="form.lieuNaissance" name="lieuNaissance" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">CIN tunisien</label><input [(ngModel)]="form.cin" name="cin" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Passeport</label><input [(ngModel)]="form.passeport" name="passeport" class="input-shell" /></div>
              </div>
            }
            @case ('contact') {
              <div class="grid gap-5 md:grid-cols-2">
                <div><label class="mb-2 block font-semibold">Email institutionnel</label><input [(ngModel)]="form.emailInstitutionnel" name="emailInstitutionnel" type="email" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Telephone</label><input [(ngModel)]="form.telephone" name="telephone" class="input-shell" /></div>
                <div class="md:col-span-2"><label class="mb-2 block font-semibold">Adresse</label><textarea [(ngModel)]="form.adresse" name="adresse" class="textarea-shell"></textarea></div>
              </div>
            }
            @case ('professionnel') {
              <div class="grid gap-5 md:grid-cols-2">
                <div><label class="mb-2 block font-semibold">Grade</label><input [(ngModel)]="form.grade" name="grade" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">ORCID</label><input [(ngModel)]="form.orcid" name="orcid" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Institution d'affectation</label><select [(ngModel)]="form.institutionAffectationId" name="institutionAffectationId" class="select-shell"><option value="">Selectionner</option>@for (item of references()?.institutions || []; track item.id) { <option [ngValue]="item.id">{{ item.nom }}</option> }</select></div>
                <div><label class="mb-2 block font-semibold">Equipe de recherche</label><select [(ngModel)]="form.equipeRechercheId" name="equipeRechercheId" class="select-shell"><option value="">Selectionner</option>@for (item of references()?.equipesRecherche || []; track item.id) { <option [ngValue]="item.id">{{ item.nom }}</option> }</select></div>
                <div><label class="mb-2 block font-semibold">Dernier diplome obtenu</label><input [(ngModel)]="form.dernierDiplomeLibre" name="dernierDiplomeLibre" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Date d'obtention du diplome</label><input [(ngModel)]="form.dateObtentionDiplome" name="dateObtentionDiplome" type="date" class="input-shell" /></div>
                <div class="md:col-span-2"><label class="mb-2 block font-semibold">Etablissement du diplome</label><input [(ngModel)]="form.etablissementDiplome" name="etablissementDiplome" class="input-shell" /></div>
              </div>
            }
            @case ('laboratoire') {
              <div class="grid gap-5">
                <div><label class="mb-2 block font-semibold">Denomination du laboratoire</label><input [(ngModel)]="form.laboratoireDenomination" name="laboratoireDenomination" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Etablissement du laboratoire</label><input [(ngModel)]="form.laboratoireEtablissement" name="laboratoireEtablissement" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Universite du laboratoire</label><input [(ngModel)]="form.laboratoireUniversite" name="laboratoireUniversite" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Responsable du laboratoire</label><input [(ngModel)]="form.laboratoireResponsable" name="laboratoireResponsable" class="input-shell" /></div>
              </div>
            }
            @case ('doctorat') {
              <div class="space-y-5">
                <label class="flex items-center gap-3 text-lg font-semibold">
                  <input [(ngModel)]="form.estDoctorant" name="estDoctorant" type="checkbox" class="h-5 w-5 rounded border-border" />
                  Je suis doctorant
                </label>
                @if (form.estDoctorant) {
                  <div class="grid gap-5 md:grid-cols-2">
                    <div class="md:col-span-2"><label class="mb-2 block font-semibold">Sujet de recherche</label><textarea [(ngModel)]="form.sujetRecherche" name="sujetRecherche" class="textarea-shell"></textarea></div>
                    <div><label class="mb-2 block font-semibold">Pourcentage d'avancement</label><input [(ngModel)]="form.pourcentageAvancement" name="pourcentageAvancement" class="input-shell" /></div>
                    <div><label class="mb-2 block font-semibold">Annee universitaire de premiere inscription</label><input [(ngModel)]="form.anneeUniversitairePremiereInscription" name="anneeUniversitairePremiereInscription" class="input-shell" placeholder="2025/2026" /></div>
                    <div><label class="mb-2 block font-semibold">Universite d'inscription</label><input [(ngModel)]="form.universiteInscription" name="universiteInscription" class="input-shell" /></div>
                    <div><label class="mb-2 block font-semibold">Directeur de these</label><input [(ngModel)]="form.directeurThese" name="directeurThese" class="input-shell" /></div>
                    <div class="md:col-span-2">
                      <label class="mb-2 block font-semibold">Attestation d'inscription</label>
                      <input type="file" class="input-shell" (change)="handleAttestationChange($event)" />
                      @if (selectedFileName()) { <div class="mt-2 text-sm text-muted-foreground">{{ selectedFileName() }}</div> }
                    </div>
                  </div>
                }
              </div>
            }
            @case ('securite') {
              <div class="grid gap-5 md:grid-cols-2">
                <div><label class="mb-2 block font-semibold">Mot de passe</label><input [(ngModel)]="form.motDePasse" name="motDePasse" type="password" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Confirmation du mot de passe</label><input [(ngModel)]="form.confirmationMotDePasse" name="confirmationMotDePasse" type="password" class="input-shell" /></div>
              </div>
              <label class="mt-4 flex items-center gap-3 text-base font-semibold">
                <input [(ngModel)]="form.conditionsAcceptees" name="conditionsAcceptees" type="checkbox" class="h-5 w-5 rounded border-border" />
                J'accepte les conditions d'utilisation de la plateforme.
              </label>
            }
          }

          @if (visibleErrors().length) {
            <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">
              @for (item of visibleErrors(); track item) { <div>{{ item }}</div> }
            </div>
          }
          @if (successMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">{{ successMessage() }}</div> }
          @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">{{ errorMessage() }}</div> }

          <div class="flex flex-wrap justify-between gap-3 pt-4">
            <div class="flex gap-3">
              <button type="button" class="btn-outline" [disabled]="currentStepIndex() === 0" (click)="previousStep()">Precedent</button>
              <a routerLink="/connexion" class="btn-outline">J'ai deja un compte</a>
            </div>
            @if (currentStepIndex() < steps.length - 1) {
              <button type="button" class="btn-secondary" (click)="nextStep()">Suivant</button>
            } @else {
              <button type="submit" class="btn-secondary" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Creation...' : 'Creer le compte' }}</button>
            }
          </div>
        </form>
      </div>
    </section>
  `
})
export class RegistrationPageComponent implements OnInit {
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
    { id: 'securite', title: 'Securite du compte' }
  ];

  readonly visibleErrors = computed(() => Object.values(this.errors()).filter(Boolean) as string[]);

  async ngOnInit() {
    try {
      const response = await api.getRegistrationReferences();
      this.references.set(response.references);
      this.form = createEmptyRegistrationPayload(response.references.laboratoireParDefaut);
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
    this.currentStepIndex.update((value) => Math.min(value + 1, this.steps.length - 1));
  }

  previousStep() {
    this.currentStepIndex.update((value) => Math.max(value - 1, 0));
  }

  async submit() {
    this.errorMessage.set('');
    this.successMessage.set('');
    const errors = validateRegistrationPayload(this.form, {
      mode: 'registration',
      hasExistingAttestation: Boolean(this.attestationFile)
    });
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = new FormData();
      appendRegistrationPayloadToFormData(payload, this.form, { includeAccountFields: true });
      if (this.attestationFile) {
        payload.set('attestationDoctorant', this.attestationFile);
      }
      await api.register(payload);
      this.successMessage.set('Votre inscription a ete enregistree. Elle sera validee par un administrateur.');
      this.form = createEmptyRegistrationPayload(this.references()?.laboratoireParDefaut);
      this.attestationFile = null;
      this.selectedFileName.set('');
      this.currentStepIndex.set(0);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de l\'inscription.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
