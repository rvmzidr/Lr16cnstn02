
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createRegistrationPayloadFromUser, appendRegistrationPayloadToFormData, validateRegistrationPayload, type DossierErrorMap } from '../../core/member/dossier';
import type { MemberArticlesData, MemberProfileData, RegistrationPayload } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';

@Component({
  selector: 'app-member-profile-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-4xl font-bold text-foreground">Mon profil</h2>
        <p class="text-lg text-muted-foreground">Mettez a jour vos informations personnelles et scientifiques.</p>
      </div>

      @if (profile()) {
        <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form class="surface-card p-8 space-y-6" (ngSubmit)="save()">
            <div class="grid gap-5 md:grid-cols-2">
              <div><label class="mb-2 block font-semibold">Nom</label><input [(ngModel)]="form.nom" name="nom" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Prenom</label><input [(ngModel)]="form.prenom" name="prenom" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Nom de jeune fille</label><input [(ngModel)]="form.nomJeuneFille" name="nomJeuneFille" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Sexe</label><select [(ngModel)]="form.sexe" name="sexe" class="select-shell"><option value="FEMME">Feminin</option><option value="HOMME">Masculin</option><option value="AUTRE">Autre</option></select></div>
              <div><label class="mb-2 block font-semibold">Date de naissance</label><input [(ngModel)]="form.dateNaissance" name="dateNaissance" type="date" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Lieu de naissance</label><input [(ngModel)]="form.lieuNaissance" name="lieuNaissance" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Email institutionnel</label><input [(ngModel)]="form.emailInstitutionnel" name="emailInstitutionnel" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Telephone</label><input [(ngModel)]="form.telephone" name="telephone" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">CIN</label><input [(ngModel)]="form.cin" name="cin" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Passeport</label><input [(ngModel)]="form.passeport" name="passeport" class="input-shell" /></div>
              <div class="md:col-span-2"><label class="mb-2 block font-semibold">Adresse</label><textarea [(ngModel)]="form.adresse" name="adresse" class="textarea-shell"></textarea></div>
            </div>

            <div class="grid gap-5 md:grid-cols-2">
              <div><label class="mb-2 block font-semibold">Grade</label><input [(ngModel)]="form.grade" name="grade" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">ORCID</label><input [(ngModel)]="form.orcid" name="orcid" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Institution</label><select [(ngModel)]="form.institutionAffectationId" name="institutionAffectationId" class="select-shell"><option value="">Selectionner</option>@for (item of profile()?.references?.institutions || []; track item.id) { <option [ngValue]="item.id">{{ item.nom }}</option> }</select></div>
              <div><label class="mb-2 block font-semibold">Equipe de recherche</label><select [(ngModel)]="form.equipeRechercheId" name="equipeRechercheId" class="select-shell"><option value="">Selectionner</option>@for (item of profile()?.references?.equipesRecherche || []; track item.id) { <option [ngValue]="item.id">{{ item.nom }}</option> }</select></div>
              <div><label class="mb-2 block font-semibold">Dernier diplome</label><input [(ngModel)]="form.dernierDiplomeLibre" name="dernierDiplomeLibre" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Date d'obtention</label><input [(ngModel)]="form.dateObtentionDiplome" name="dateObtentionDiplome" type="date" class="input-shell" /></div>
              <div class="md:col-span-2"><label class="mb-2 block font-semibold">Etablissement du diplome</label><input [(ngModel)]="form.etablissementDiplome" name="etablissementDiplome" class="input-shell" /></div>
            </div>

            <div class="grid gap-5">
              <div><label class="mb-2 block font-semibold">Denomination du laboratoire</label><input [(ngModel)]="form.laboratoireDenomination" name="laboratoireDenomination" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Etablissement du laboratoire</label><input [(ngModel)]="form.laboratoireEtablissement" name="laboratoireEtablissement" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Universite du laboratoire</label><input [(ngModel)]="form.laboratoireUniversite" name="laboratoireUniversite" class="input-shell" /></div>
              <div><label class="mb-2 block font-semibold">Responsable du laboratoire</label><input [(ngModel)]="form.laboratoireResponsable" name="laboratoireResponsable" class="input-shell" /></div>
              <label class="flex items-center gap-3 text-lg font-semibold"><input [(ngModel)]="form.estDoctorant" name="estDoctorant" type="checkbox" class="h-5 w-5 rounded border-border" />Je suis doctorant</label>
            </div>

            @if (form.estDoctorant) {
              <div class="grid gap-5 md:grid-cols-2">
                <div class="md:col-span-2"><label class="mb-2 block font-semibold">Sujet de recherche</label><textarea [(ngModel)]="form.sujetRecherche" name="sujetRecherche" class="textarea-shell"></textarea></div>
                <div><label class="mb-2 block font-semibold">Pourcentage d'avancement</label><input [(ngModel)]="form.pourcentageAvancement" name="pourcentageAvancement" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Annee universitaire de premiere inscription</label><input [(ngModel)]="form.anneeUniversitairePremiereInscription" name="anneeUniversitairePremiereInscription" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Universite d'inscription</label><input [(ngModel)]="form.universiteInscription" name="universiteInscription" class="input-shell" /></div>
                <div><label class="mb-2 block font-semibold">Directeur de these</label><input [(ngModel)]="form.directeurThese" name="directeurThese" class="input-shell" /></div>
                <div class="md:col-span-2"><label class="mb-2 block font-semibold">Nouvelle attestation</label><input type="file" class="input-shell" (change)="handleAttestationChange($event)" /></div>
              </div>
            }

            @if (errorMessages().length) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">@for (item of errorMessages(); track item) { <div>{{ item }}</div> }</div> }
            @if (statusMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">{{ statusMessage() }}</div> }
            <button type="submit" class="btn-secondary" [disabled]="isSaving()">{{ isSaving() ? 'Enregistrement...' : 'Enregistrer les modifications' }}</button>
          </form>

          <div class="space-y-6">
            <div class="surface-card p-8">
              <h3 class="text-3xl font-bold text-foreground">Resume du compte</h3>
              <div class="mt-6 space-y-3 text-base text-muted-foreground">
                <div>Nom complet: <span class="font-semibold text-foreground">{{ profile()?.utilisateur?.nomComplet }}</span></div>
                <div>Role: <span class="font-semibold text-foreground">{{ profile()?.utilisateur?.role || 'MEMBRE' }}</span></div>
                <div>Statut: <span class="font-semibold text-foreground">{{ profile()?.utilisateur?.statut }}</span></div>
                <div>Articles personnels: <span class="font-semibold text-foreground">{{ memberArticles()?.articles?.length || 0 }}</span></div>
              </div>
            </div>

            <div class="surface-card p-8">
              <h3 class="text-3xl font-bold text-foreground">Attestation doctorant</h3>
              <p class="mt-4 text-muted-foreground">
                @if (profile()?.utilisateur?.doctorat?.attestation?.disponible) {
                  Une attestation est deja disponible pour votre dossier.
                } @else {
                  Aucun document attestation n'est actuellement associe.
                }
              </p>
              @if (profile()?.utilisateur?.doctorat?.attestation?.disponible) {
                <button type="button" class="btn-outline mt-5" (click)="downloadAttestation()">Telecharger l'attestation</button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MemberProfilePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly profile = signal<MemberProfileData | null>(null);
  readonly memberArticles = signal<MemberArticlesData | null>(null);
  readonly errors = signal<DossierErrorMap>({});
  readonly statusMessage = signal('');
  readonly isSaving = signal(false);
  readonly errorMessages = signal<string[]>([]);
  attestationFile: File | null = null;
  form: RegistrationPayload = {
    nom: '', prenom: '', nomJeuneFille: '', dateNaissance: '', lieuNaissance: '', sexe: 'FEMME', cin: '', passeport: '',
    emailInstitutionnel: '', telephone: '', adresse: '', grade: '', institutionAffectationId: '', dernierDiplomeLibre: '',
    dateObtentionDiplome: '', etablissementDiplome: '', orcid: '', equipeRechercheId: '', laboratoireDenomination: '',
    laboratoireEtablissement: '', laboratoireUniversite: '', laboratoireResponsable: '', estDoctorant: false, sujetRecherche: '',
    pourcentageAvancement: '', anneeUniversitairePremiereInscription: '', universiteInscription: '', directeurThese: '',
    motDePasse: '', confirmationMotDePasse: '', conditionsAcceptees: false
  };

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    try {
      const [profile, articles] = await Promise.all([
        api.getProfile(token),
        api.listMemberArticles(token)
      ]);
      this.profile.set(profile);
      this.memberArticles.set(articles);
      this.form = createRegistrationPayloadFromUser(profile.utilisateur, profile.references);
    } catch {
      this.profile.set(null);
      this.memberArticles.set(null);
    }
  }

  handleAttestationChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.attestationFile = input.files?.[0] || null;
  }

  async save() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    this.statusMessage.set('');
    const errors = validateRegistrationPayload(this.form, {
      mode: 'profile',
      hasExistingAttestation: Boolean(this.attestationFile || this.profile()?.utilisateur.doctorat?.attestation?.disponible)
    });
    this.errors.set(errors);
    this.errorMessages.set(Object.values(errors).filter(Boolean) as string[]);
    if (Object.keys(errors).length) {
      return;
    }
    this.isSaving.set(true);
    try {
      const payload = new FormData();
      appendRegistrationPayloadToFormData(payload, this.form, { includeAccountFields: false });
      if (this.attestationFile) {
        payload.set('attestationDoctorant', this.attestationFile);
      }
      const response = await api.updateProfile(token, payload);
      this.profile.set(response);
      this.form = createRegistrationPayloadFromUser(response.utilisateur, response.references);
      this.attestationFile = null;
      this.statusMessage.set('Profil mis a jour avec succes.');
      await this.auth.refreshProfile();
    } catch (error) {
      this.errorMessages.set([error instanceof Error ? error.message : 'Erreur lors de la mise a jour.']);
    } finally {
      this.isSaving.set(false);
    }
  }

  async downloadAttestation() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    await api.downloadMyDoctorantAttestation(token);
  }
}
