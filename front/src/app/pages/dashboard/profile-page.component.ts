import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type {
  MemberProfileData,
  RegistrationPayload,
  UploadConstraints,
} from '../../core/models/models';
import {
  appendRegistrationPayloadToFormData,
  createEmptyRegistrationPayload,
  createRegistrationPayloadFromUser,
} from '../../core/member/dossier';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import type { LocalizedCopy } from '../../core/services/site-preferences.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { getInitials } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';
import { RoleService } from '../../shared/services/role.service';

type ProfileFormErrors = Partial<
  Record<keyof RegistrationPayload | 'photoProfil' | 'attestationDoctorant', string>
>;

function copy(fr: string, en: string, ar: string): LocalizedCopy {
  return { fr, en, ar };
}

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-7">
      <section class="app-page-hero">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">{{ site.localize(pageEyebrow) }}</p>

          <div class="app-page-header mt-2">
            <div class="space-y-1.5">
              <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
              <p class="app-page-description">
                {{ site.localize(pageDescription) }}
              </p>
            </div>
          </div>

          <div class="app-page-pills">
            <span class="app-page-pill">{{ localizedRoleLabel() }}</span>
            <span class="app-page-pill">
              {{ site.localize(teamLabel) }}:
              {{ currentTeamName() || site.localize(notProvidedLabel) }}
            </span>
            <span class="app-page-pill">
              {{ site.localize(doctorantLabel) }}:
              {{ isDoctorant() ? site.localize(yesLabel) : site.localize(noLabel) }}
            </span>
          </div>
        </div>
      </section>

      @if (loadingPage()) {
        <div class="surface-card rounded-2xl border border-border bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          {{ site.localize(loadingLabel) }}
        </div>
      } @else {
        <div class="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <aside class="space-y-6">
            <section class="surface-card p-6 lg:p-7">
              <div class="flex flex-col items-center text-center">
                <div class="relative">
                  @if (displayPhotoUrl()) {
                    <img
                      [src]="displayPhotoUrl()"
                      [alt]="site.localize(profilePhotoAlt)"
                      class="h-28 w-28 rounded-full border border-border object-cover shadow-sm"
                    />
                  } @else {
                    <div class="flex h-28 w-28 items-center justify-center rounded-full border border-border bg-primary/10 text-2xl font-semibold text-primary shadow-sm">
                      {{ initials() }}
                    </div>
                  }
                </div>

                <div class="mt-4 space-y-1">
                  <h3 class="text-xl font-semibold text-foreground">{{ fullName() }}</h3>
                  <p class="text-sm text-muted-foreground">{{ form.emailInstitutionnel || currentEmail() }}</p>
                  <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {{ localizedRoleLabel() }}
                  </span>
                </div>

                <div class="mt-5 w-full rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-left">
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                      <lucide-icon [img]="icons.Atom" class="h-4 w-4 text-primary"></lucide-icon>
                      <span>{{ site.localize(laboratoryLabel) }}</span>
                    </div>
                    <p class="text-sm font-semibold text-foreground">
                      {{ currentLaboratoryName() || site.localize(notProvidedLabel) }}
                    </p>
                  </div>
                  <div class="mt-3 space-y-2">
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                      <lucide-icon [img]="icons.Users" class="h-4 w-4 text-primary"></lucide-icon>
                      <span>{{ site.localize(teamLabel) }}</span>
                    </div>
                    <p class="text-sm font-semibold text-foreground">
                      {{ currentTeamName() || site.localize(notProvidedLabel) }}
                    </p>
                  </div>
                </div>

                <div class="mt-5 w-full space-y-3">
                  <label
                    for="profile-photo-input"
                    class="btn-secondary flex w-full cursor-pointer items-center justify-center gap-2"
                  >
                    <lucide-icon [img]="icons.Plus" class="h-4 w-4"></lucide-icon>
                    <span>{{ site.localize(changePhotoLabel) }}</span>
                  </label>
                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="hidden"
                    (change)="handlePhotoSelection($event)"
                  />

                  @if (selectedPhotoName()) {
                    <button
                      type="button"
                      class="btn-outline w-full"
                      [disabled]="uploadingPhoto()"
                      (click)="uploadSelectedPhoto()"
                    >
                      {{ uploadingPhoto() ? site.localize(uploadingLabel) : site.localize(savePhotoLabel) }}
                    </button>

                    <button
                      type="button"
                      class="btn-outline w-full"
                      [disabled]="uploadingPhoto()"
                      (click)="clearSelectedPhoto()"
                    >
                      {{ site.localize(cancelSelectionLabel) }}
                    </button>
                  } @else if (hasStoredPhoto()) {
                    <button
                      type="button"
                      class="btn-outline w-full"
                      [disabled]="removingPhoto()"
                      (click)="deletePhoto()"
                    >
                      {{ removingPhoto() ? site.localize(removingLabel) : site.localize(deletePhotoLabel) }}
                    </button>
                  }

                  <p class="text-xs text-muted-foreground">
                    {{ photoConstraintsLabel() }}
                  </p>

                  @if (photoMessage()) {
                    <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
                      {{ photoMessage() }}
                    </div>
                  }
                  @if (photoError()) {
                    <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
                      {{ photoError() }}
                    </div>
                  }
                </div>
              </div>
            </section>

            <section class="surface-card p-6">
              <div class="flex items-start gap-3">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <lucide-icon [img]="icons.FileText" class="h-4 w-4"></lucide-icon>
                </span>
                <div>
                  <h3 class="text-base font-semibold text-foreground">{{ site.localize(attestationCardTitle) }}</h3>
                  <p class="mt-1 text-sm text-muted-foreground">{{ site.localize(attestationCardDescription) }}</p>
                </div>
              </div>

              @if (isDoctorant()) {
                <div class="mt-5 space-y-3">
                  <label class="block space-y-2">
                    <span class="text-sm font-semibold text-foreground">{{ site.localize(replaceAttestationLabel) }}</span>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      class="input-shell h-11 pt-2"
                      (change)="handleAttestationSelection($event)"
                    />
                  </label>

                  @if (selectedAttestationName()) {
                    <p class="text-xs text-muted-foreground">
                      {{ selectedAttestationName() }}
                    </p>
                  } @else if (hasExistingAttestation()) {
                    <p class="text-xs text-muted-foreground">
                      {{ currentAttestationName() }}
                    </p>
                  }

                  @if (hasExistingAttestation()) {
                    <button
                      type="button"
                      class="btn-outline w-full"
                      (click)="downloadDoctorantAttestation()"
                    >
                      {{ site.localize(downloadAttestationLabel) }}
                    </button>
                  }

                  @if (errors().attestationDoctorant) {
                    <p class="text-xs text-feedback-error">
                      {{ errors().attestationDoctorant }}
                    </p>
                  }
                </div>
              } @else {
                <div class="mt-5 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                  {{ site.localize(nonDoctorantHint) }}
                </div>
              }
            </section>
          </aside>

          <form class="space-y-6" (ngSubmit)="saveProfile()">
            <section class="surface-card p-6 lg:p-7">
              <div class="flex items-start gap-3 border-b border-border/70 pb-4">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <lucide-icon [img]="icons.UserCircle2" class="h-4 w-4"></lucide-icon>
                </span>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">{{ site.localize(personalSectionTitle) }}</h3>
                  <p class="text-sm text-muted-foreground">{{ site.localize(personalSectionDescription) }}</p>
                </div>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(lastNameLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="nom"
                    [(ngModel)]="form.nom"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().nom) {
                    <span class="text-xs text-feedback-error">{{ errors().nom }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(firstNameLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="prenom"
                    [(ngModel)]="form.prenom"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().prenom) {
                    <span class="text-xs text-feedback-error">{{ errors().prenom }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(maidenNameLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="nomJeuneFille"
                    [(ngModel)]="form.nomJeuneFille"
                    [disabled]="savingProfile()"
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(genderLabel) }}</span>
                  <select
                    class="select-shell h-11"
                    name="sexe"
                    [(ngModel)]="form.sexe"
                    [disabled]="savingProfile()"
                  >
                    <option value="FEMME">{{ site.localize(femaleLabel) }}</option>
                    <option value="HOMME">{{ site.localize(maleLabel) }}</option>
                    <option value="AUTRE">{{ site.localize(otherLabel) }}</option>
                  </select>
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(dateOfBirthLabel) }}</span>
                  <input
                    type="date"
                    class="input-shell h-11"
                    name="dateNaissance"
                    [(ngModel)]="form.dateNaissance"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().dateNaissance) {
                    <span class="text-xs text-feedback-error">{{ errors().dateNaissance }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(placeOfBirthLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="lieuNaissance"
                    [(ngModel)]="form.lieuNaissance"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().lieuNaissance) {
                    <span class="text-xs text-feedback-error">{{ errors().lieuNaissance }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(cinLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="cin"
                    [(ngModel)]="form.cin"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().cin) {
                    <span class="text-xs text-feedback-error">{{ errors().cin }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(passportLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="passeport"
                    [(ngModel)]="form.passeport"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().passeport) {
                    <span class="text-xs text-feedback-error">{{ errors().passeport }}</span>
                  }
                </label>
              </div>
            </section>

            <section class="surface-card p-6 lg:p-7">
              <div class="flex items-start gap-3 border-b border-border/70 pb-4">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <lucide-icon [img]="icons.Mail" class="h-4 w-4"></lucide-icon>
                </span>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">{{ site.localize(contactSectionTitle) }}</h3>
                  <p class="text-sm text-muted-foreground">{{ site.localize(contactSectionDescription) }}</p>
                </div>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(institutionalEmailLabel) }}</span>
                  <input
                    type="email"
                    class="input-shell h-11"
                    name="emailInstitutionnel"
                    [(ngModel)]="form.emailInstitutionnel"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().emailInstitutionnel) {
                    <span class="text-xs text-feedback-error">{{ errors().emailInstitutionnel }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(secondaryEmailLabel) }}</span>
                  <input
                    type="email"
                    class="input-shell h-11"
                    name="emailSecondaire"
                    [(ngModel)]="form.emailSecondaire"
                    [disabled]="savingProfile()"
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(phoneLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="telephone"
                    [(ngModel)]="form.telephone"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().telephone) {
                    <span class="text-xs text-feedback-error">{{ errors().telephone }}</span>
                  }
                </label>

                <label class="block space-y-2 md:col-span-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(addressLabel) }}</span>
                  <textarea
                    class="textarea-shell min-h-28"
                    name="adresse"
                    [(ngModel)]="form.adresse"
                    [disabled]="savingProfile()"
                  ></textarea>
                </label>
              </div>
            </section>

            <section class="surface-card p-6 lg:p-7">
              <div class="flex items-start gap-3 border-b border-border/70 pb-4">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <lucide-icon [img]="icons.Atom" class="h-4 w-4"></lucide-icon>
                </span>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">{{ site.localize(professionalSectionTitle) }}</h3>
                  <p class="text-sm text-muted-foreground">{{ site.localize(professionalSectionDescription) }}</p>
                </div>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(gradeLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="grade"
                    [(ngModel)]="form.grade"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().grade) {
                    <span class="text-xs text-feedback-error">{{ errors().grade }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(orcidLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="orcid"
                    [(ngModel)]="form.orcid"
                    [disabled]="savingProfile()"
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(institutionLabel) }}</span>
                  <select
                    class="select-shell h-11"
                    name="institutionAffectationId"
                    [(ngModel)]="form.institutionAffectationId"
                    [disabled]="savingProfile()"
                  >
                    <option [ngValue]="''">{{ site.localize(selectOptionLabel) }}</option>
                    @for (item of institutions(); track item.id) {
                      <option [ngValue]="item.id">{{ item.nom }}</option>
                    }
                  </select>
                  @if (errors().institutionAffectationId) {
                    <span class="text-xs text-feedback-error">{{ errors().institutionAffectationId }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(teamLabel) }}</span>
                  <select
                    class="select-shell h-11"
                    name="equipeRechercheId"
                    [(ngModel)]="form.equipeRechercheId"
                    [disabled]="savingProfile()"
                  >
                    <option [ngValue]="''">{{ site.localize(selectOptionLabel) }}</option>
                    @for (item of researchTeams(); track item.id) {
                      <option [ngValue]="item.id">{{ item.nom }}</option>
                    }
                  </select>
                  @if (errors().equipeRechercheId) {
                    <span class="text-xs text-feedback-error">{{ errors().equipeRechercheId }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(lastDegreeLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="dernierDiplomeLibre"
                    [(ngModel)]="form.dernierDiplomeLibre"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().dernierDiplomeLibre) {
                    <span class="text-xs text-feedback-error">{{ errors().dernierDiplomeLibre }}</span>
                  }
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(degreeDateLabel) }}</span>
                  <input
                    type="date"
                    class="input-shell h-11"
                    name="dateObtentionDiplome"
                    [(ngModel)]="form.dateObtentionDiplome"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().dateObtentionDiplome) {
                    <span class="text-xs text-feedback-error">{{ errors().dateObtentionDiplome }}</span>
                  }
                </label>

                <label class="block space-y-2 md:col-span-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(degreeInstitutionLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="etablissementDiplome"
                    [(ngModel)]="form.etablissementDiplome"
                    [disabled]="savingProfile()"
                  />
                  @if (errors().etablissementDiplome) {
                    <span class="text-xs text-feedback-error">{{ errors().etablissementDiplome }}</span>
                  }
                </label>
              </div>
            </section>

            <section class="surface-card p-6 lg:p-7">
              <div class="flex items-start gap-3 border-b border-border/70 pb-4">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <lucide-icon [img]="icons.Home" class="h-4 w-4"></lucide-icon>
                </span>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">{{ site.localize(labSectionTitle) }}</h3>
                  <p class="text-sm text-muted-foreground">{{ site.localize(labSectionDescription) }}</p>
                </div>
              </div>

              <div class="mt-5 grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(labNameLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="laboratoireDenomination"
                    [(ngModel)]="form.laboratoireDenomination"
                    [disabled]="savingProfile()"
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(labInstitutionLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="laboratoireEtablissement"
                    [(ngModel)]="form.laboratoireEtablissement"
                    [disabled]="savingProfile()"
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(labUniversityLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="laboratoireUniversite"
                    [(ngModel)]="form.laboratoireUniversite"
                    [disabled]="savingProfile()"
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-semibold text-foreground">{{ site.localize(labManagerLabel) }}</span>
                  <input
                    type="text"
                    class="input-shell h-11"
                    name="laboratoireResponsable"
                    [(ngModel)]="form.laboratoireResponsable"
                    [disabled]="savingProfile()"
                  />
                </label>
              </div>
            </section>

            <section class="surface-card p-6 lg:p-7">
              <div class="flex items-start gap-3 border-b border-border/70 pb-4">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <lucide-icon [img]="icons.Microscope" class="h-4 w-4"></lucide-icon>
                </span>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">{{ site.localize(doctorantSectionTitle) }}</h3>
                  <p class="text-sm text-muted-foreground">{{ site.localize(doctorantSectionDescription) }}</p>
                </div>
              </div>

              <div class="mt-5 space-y-5">
                <label class="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    class="h-5 w-5 rounded border-border text-primary"
                    name="estDoctorant"
                    [(ngModel)]="form.estDoctorant"
                    [disabled]="savingProfile()"
                  />
                  <span>{{ site.localize(doctorantToggleLabel) }}</span>
                </label>

                @if (isDoctorant()) {
                  <div class="grid gap-4 md:grid-cols-2">
                    <label class="block space-y-2 md:col-span-2">
                      <span class="text-sm font-semibold text-foreground">{{ site.localize(researchTopicLabel) }}</span>
                      <textarea
                        class="textarea-shell min-h-28"
                        name="sujetRecherche"
                        [(ngModel)]="form.sujetRecherche"
                        [disabled]="savingProfile()"
                      ></textarea>
                      @if (errors().sujetRecherche) {
                        <span class="text-xs text-feedback-error">{{ errors().sujetRecherche }}</span>
                      }
                    </label>

                    <label class="block space-y-2">
                      <span class="text-sm font-semibold text-foreground">{{ site.localize(progressLabel) }}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        class="input-shell h-11"
                        name="pourcentageAvancement"
                        [(ngModel)]="form.pourcentageAvancement"
                        [disabled]="savingProfile()"
                      />
                      @if (errors().pourcentageAvancement) {
                        <span class="text-xs text-feedback-error">{{ errors().pourcentageAvancement }}</span>
                      }
                    </label>

                    <label class="block space-y-2">
                      <span class="text-sm font-semibold text-foreground">{{ site.localize(firstRegistrationYearLabel) }}</span>
                      <input
                        type="text"
                        class="input-shell h-11"
                        placeholder="2025/2026"
                        name="anneeUniversitairePremiereInscription"
                        [(ngModel)]="form.anneeUniversitairePremiereInscription"
                        [disabled]="savingProfile()"
                      />
                      @if (errors().anneeUniversitairePremiereInscription) {
                        <span class="text-xs text-feedback-error">{{ errors().anneeUniversitairePremiereInscription }}</span>
                      }
                    </label>

                    <label class="block space-y-2">
                      <span class="text-sm font-semibold text-foreground">{{ site.localize(universityRegistrationLabel) }}</span>
                      <input
                        type="text"
                        class="input-shell h-11"
                        name="universiteInscription"
                        [(ngModel)]="form.universiteInscription"
                        [disabled]="savingProfile()"
                      />
                      @if (errors().universiteInscription) {
                        <span class="text-xs text-feedback-error">{{ errors().universiteInscription }}</span>
                      }
                    </label>

                    <label class="block space-y-2">
                      <span class="text-sm font-semibold text-foreground">{{ site.localize(supervisorLabel) }}</span>
                      <input
                        type="text"
                        class="input-shell h-11"
                        name="directeurThese"
                        [(ngModel)]="form.directeurThese"
                        [disabled]="savingProfile()"
                      />
                      @if (errors().directeurThese) {
                        <span class="text-xs text-feedback-error">{{ errors().directeurThese }}</span>
                      }
                    </label>
                  </div>
                } @else {
                  <div class="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                    {{ site.localize(doctorantDisabledHint) }}
                  </div>
                }
              </div>
            </section>

            @if (saveMessage()) {
              <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
                {{ saveMessage() }}
              </div>
            }
            @if (saveError()) {
              <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
                {{ saveError() }}
              </div>
            }

            <div class="flex justify-end">
              <button
                type="submit"
                class="btn-secondary min-w-[16rem]"
                [disabled]="savingProfile()"
              >
                {{ savingProfile() ? site.localize(savingLabel) : site.localize(saveProfileLabel) }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly roleService = inject(RoleService);
  readonly icons = sharedIcons;

  readonly pageEyebrow = copy('Espace profil', 'Profile area', 'مساحة الملف الشخصي');
  readonly pageTitle = copy('Mon profil', 'My profile', 'ملفي الشخصي');
  readonly pageDescription = copy(
    'Consultez et mettez à jour vos informations personnelles, professionnelles et doctorales dans le même environnement premium que le reste du dashboard.',
    'Review and update your personal, professional, and doctoral information in the same premium environment as the rest of the dashboard.',
    'راجع وحدّث معلوماتك الشخصية والمهنية ومعلومات الدكتوراه ضمن نفس الواجهة الراقية لباقي لوحة التحكم.',
  );
  readonly loadingLabel = copy('Chargement du profil...', 'Loading profile...', 'جارٍ تحميل الملف الشخصي...');
  readonly profilePhotoAlt = copy('Photo de profil', 'Profile photo', 'صورة الملف الشخصي');
  readonly personalSectionTitle = copy('Informations personnelles', 'Personal information', 'المعلومات الشخصية');
  readonly personalSectionDescription = copy(
    'Identité civile, date et lieu de naissance, ainsi que les identifiants administratifs.',
    'Civil identity, birth details, and administrative identifiers.',
    'الهوية المدنية وتفاصيل الميلاد والمعرفات الإدارية.',
  );
  readonly contactSectionTitle = copy('Coordonnées', 'Contact information', 'معلومات الاتصال');
  readonly contactSectionDescription = copy(
    'Canaux de contact institutionnels et coordonnées utiles au laboratoire.',
    'Institutional contact channels and contact details useful to the laboratory.',
    'قنوات الاتصال المؤسسية وبيانات التواصل المفيدة للمخبر.',
  );
  readonly professionalSectionTitle = copy('Informations professionnelles', 'Professional information', 'المعلومات المهنية');
  readonly professionalSectionDescription = copy(
    'Statut au laboratoire, établissement d’affectation, équipe et parcours académique.',
    'Laboratory status, institution, research team, and academic background.',
    'الوضعية داخل المخبر ومؤسسة الإلحاق وفريق البحث والمسار الأكاديمي.',
  );
  readonly labSectionTitle = copy('Ancrage laboratoire', 'Laboratory profile', 'بيانات المخبر');
  readonly labSectionDescription = copy(
    'Rattachement au laboratoire et informations de référence utilisées dans les autres modules.',
    'Laboratory affiliation and reference information used by other modules.',
    'الانتماء إلى المخبر والبيانات المرجعية المستخدمة في الوحدات الأخرى.',
  );
  readonly doctorantSectionTitle = copy('Parcours doctorant', 'Doctoral information', 'معلومات الدكتوراه');
  readonly doctorantSectionDescription = copy(
    'Affichez cette section uniquement si votre profil correspond à un doctorant.',
    'Show this section only when your profile corresponds to a doctoral student.',
    'تظهر هذه الخانة فقط عندما يكون الملف الشخصي لطالب دكتوراه.',
  );
  readonly attestationCardTitle = copy('Attestation doctorant', 'Doctoral attestation', 'شهادة الدكتوراه');
  readonly attestationCardDescription = copy(
    'Téléversez une nouvelle attestation ou récupérez le fichier déjà disponible pour votre dossier.',
    'Upload a new attestation or retrieve the file already stored for your record.',
    'ارفع شهادة جديدة أو استرجع الملف المتوفر بالفعل في ملفك.',
  );
  readonly replaceAttestationLabel = copy('Remplacer le justificatif', 'Replace supporting file', 'استبدال ملف الإثبات');
  readonly downloadAttestationLabel = copy('Télécharger l’attestation actuelle', 'Download current attestation', 'تنزيل الشهادة الحالية');
  readonly changePhotoLabel = copy('Choisir une photo', 'Choose photo', 'اختيار صورة');
  readonly savePhotoLabel = copy('Enregistrer la photo', 'Save photo', 'حفظ الصورة');
  readonly deletePhotoLabel = copy('Supprimer la photo', 'Delete photo', 'حذف الصورة');
  readonly cancelSelectionLabel = copy('Annuler la sélection', 'Cancel selection', 'إلغاء التحديد');
  readonly uploadingLabel = copy('Téléversement...', 'Uploading...', 'جارٍ الرفع...');
  readonly removingLabel = copy('Suppression...', 'Removing...', 'جارٍ الحذف...');
  readonly saveProfileLabel = copy('Enregistrer les modifications', 'Save changes', 'حفظ التعديلات');
  readonly savingLabel = copy('Enregistrement...', 'Saving...', 'جارٍ الحفظ...');
  readonly yesLabel = copy('Oui', 'Yes', 'نعم');
  readonly noLabel = copy('Non', 'No', 'لا');
  readonly selectOptionLabel = copy('Sélectionner', 'Select', 'اختر');
  readonly notProvidedLabel = copy('Non renseigné', 'Not provided', 'غير متوفر');
  readonly lastNameLabel = copy('Nom', 'Last name', 'اللقب');
  readonly firstNameLabel = copy('Prénom', 'First name', 'الاسم');
  readonly maidenNameLabel = copy('Nom de jeune fille', 'Maiden name', 'اسم العائلة قبل الزواج');
  readonly genderLabel = copy('Sexe', 'Gender', 'الجنس');
  readonly femaleLabel = copy('Féminin', 'Female', 'أنثى');
  readonly maleLabel = copy('Masculin', 'Male', 'ذكر');
  readonly otherLabel = copy('Autre', 'Other', 'آخر');
  readonly dateOfBirthLabel = copy('Date de naissance', 'Date of birth', 'تاريخ الميلاد');
  readonly placeOfBirthLabel = copy('Lieu de naissance', 'Place of birth', 'مكان الولادة');
  readonly cinLabel = copy('CIN', 'National ID', 'بطاقة التعريف');
  readonly passportLabel = copy('Passeport', 'Passport', 'جواز السفر');
  readonly institutionalEmailLabel = copy('Email institutionnel', 'Institutional email', 'البريد المؤسسي');
  readonly secondaryEmailLabel = copy('Email secondaire', 'Secondary email', 'البريد الثانوي');
  readonly phoneLabel = copy('Numéro de téléphone', 'Phone number', 'رقم الهاتف');
  readonly addressLabel = copy('Adresse', 'Address', 'العنوان');
  readonly gradeLabel = copy('Grade / statut au laboratoire', 'Grade / laboratory status', 'الرتبة / الصفة داخل المخبر');
  readonly orcidLabel = copy('ORCID', 'ORCID', 'أوركيد');
  readonly institutionLabel = copy('Institution d’affectation', 'Institution', 'مؤسسة الإلحاق');
  readonly teamLabel = copy('Équipe de recherche', 'Research team', 'فريق البحث');
  readonly lastDegreeLabel = copy('Dernier diplôme obtenu', 'Latest degree obtained', 'آخر شهادة متحصل عليها');
  readonly degreeDateLabel = copy('Date d’obtention', 'Graduation date', 'تاريخ الحصول على الشهادة');
  readonly degreeInstitutionLabel = copy('Établissement du diplôme', 'Degree institution', 'مؤسسة الشهادة');
  readonly laboratoryLabel = copy('Laboratoire', 'Laboratory', 'المخبر');
  readonly labNameLabel = copy('Dénomination du laboratoire', 'Laboratory name', 'اسم المخبر');
  readonly labInstitutionLabel = copy('Établissement du laboratoire', 'Laboratory institution', 'مؤسسة المخبر');
  readonly labUniversityLabel = copy('Université du laboratoire', 'Laboratory university', 'جامعة المخبر');
  readonly labManagerLabel = copy('Responsable du laboratoire', 'Laboratory lead', 'مسؤول المخبر');
  readonly doctorantLabel = copy('Doctorant', 'Doctoral student', 'طالب دكتوراه');
  readonly doctorantToggleLabel = copy('Mon profil relève du statut doctorant', 'My profile is doctoral', 'ملفي الشخصي ضمن وضعية دكتوراه');
  readonly researchTopicLabel = copy('Sujet de recherche', 'Research topic', 'موضوع البحث');
  readonly progressLabel = copy('Pourcentage d’avancement', 'Progress percentage', 'نسبة التقدم');
  readonly firstRegistrationYearLabel = copy(
    'Année de première inscription',
    'First enrollment academic year',
    'السنة الجامعية لأول تسجيل',
  );
  readonly universityRegistrationLabel = copy('Université d’inscription', 'Enrollment university', 'جامعة التسجيل');
  readonly supervisorLabel = copy('Directeur de thèse', 'Thesis supervisor', 'مدير الأطروحة');
  readonly doctorantDisabledHint = copy(
    'Activez cette section uniquement si votre dossier doit comporter des informations doctorales et une attestation.',
    'Enable this section only if your profile must include doctoral information and an attestation.',
    'فعّل هذه الخانة فقط إذا كان ملفك يتطلب معلومات دكتوراه وشهادة.',
  );
  readonly nonDoctorantHint = copy(
    'Aucune attestation doctorant n’est nécessaire tant que le profil n’est pas marqué comme doctorant.',
    'No doctoral attestation is required while the profile is not marked as doctoral.',
    'لا حاجة إلى شهادة دكتوراه ما دام الملف غير مميز كطالب دكتوراه.',
  );

  readonly loadingPage = signal(false);
  readonly savingProfile = signal(false);
  readonly uploadingPhoto = signal(false);
  readonly removingPhoto = signal(false);
  readonly saveMessage = signal('');
  readonly saveError = signal('');
  readonly photoMessage = signal('');
  readonly photoError = signal('');
  readonly errors = signal<ProfileFormErrors>({});
  readonly selectedPhotoName = signal('');
  readonly selectedAttestationName = signal('');
  readonly currentPhotoUrl = signal<string | null>(null);
  readonly previewPhotoUrl = signal<string | null>(null);
  readonly profileData = signal<MemberProfileData | null>(null);

  readonly currentUser = computed(
    () => this.profileData()?.utilisateur ?? this.auth.session()?.utilisateur ?? null,
  );
  readonly institutions = computed(
    () => this.profileData()?.references?.institutions ?? [],
  );
  readonly researchTeams = computed(
    () => this.profileData()?.references?.equipesRecherche ?? [],
  );
  readonly photoConstraints = computed<UploadConstraints | null>(
    () => this.profileData()?.references?.televersementPhotoProfil ?? null,
  );
  readonly displayPhotoUrl = computed(
    () => this.previewPhotoUrl() || this.currentPhotoUrl(),
  );
  readonly hasStoredPhoto = computed(() =>
    Boolean(this.currentUser()?.profil?.photoUrl),
  );
  readonly hasExistingAttestation = computed(() =>
    Boolean(this.currentUser()?.doctorat?.attestation?.disponible),
  );
  readonly isDoctorant = computed(() => Boolean(this.form.estDoctorant));
  readonly initials = computed(() => getInitials(this.fullName()));
  readonly currentTeamName = computed(
    () => this.currentUser()?.profil?.equipeRecherche?.nom || '',
  );
  readonly currentLaboratoryName = computed(
    () =>
      this.currentUser()?.profil?.laboratoireDenomination ||
      this.currentUser()?.profil?.institutionAffectation?.nom ||
      '',
  );

  form: RegistrationPayload = createEmptyRegistrationPayload();

  private photoFile: File | null = null;
  private attestationFile: File | null = null;
  private currentPhotoObjectUrl: string | null = null;
  private previewPhotoObjectUrl: string | null = null;
  private photoRequestId = 0;

  async ngOnInit() {
    await this.loadProfile();
  }

  ngOnDestroy() {
    this.replaceCurrentPhotoUrl(null);
    this.replacePreviewPhotoUrl(null);
  }

  fullName() {
    const value = `${this.form.prenom || ''} ${this.form.nom || ''}`.trim();
    return value || this.currentUser()?.nomComplet || '';
  }

  currentEmail() {
    return this.currentUser()?.emailInstitutionnel || '';
  }

  currentAttestationName() {
    return this.currentUser()?.doctorat?.attestation?.nomOriginal || '';
  }

  localizedRoleLabel() {
    if (this.roleService.isChef()) {
      return this.site.localize(copy('Chef de labo', 'Lab Head', 'رئيس المخبر'));
    }

    return this.site.localize(copy('Membre', 'Member', 'عضو'));
  }

  photoConstraintsLabel() {
    const constraints = this.photoConstraints();
    if (!constraints) {
      return this.site.localize(
        copy(
          'Formats image usuels autorisés.',
          'Standard image formats are supported.',
          'تنسيقات الصور الشائعة مدعومة.',
        ),
      );
    }

    const sizeMb = (constraints.tailleMaxOctets / (1024 * 1024)).toFixed(0);
    return this.site.localize(
      copy(
        `Formats autorisés: ${constraints.formats.join(', ')}. Taille maximale: ${sizeMb} Mo.`,
        `Allowed formats: ${constraints.formats.join(', ')}. Maximum size: ${sizeMb} MB.`,
        `الأنواع المسموحة: ${constraints.formats.join(', ')}. الحجم الأقصى: ${sizeMb} ميغابايت.`,
      ),
    );
  }

  handlePhotoSelection(event: Event) {
    this.photoMessage.set('');
    this.photoError.set('');

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      return;
    }

    const constraints = this.photoConstraints();
    const allowedFormats = constraints?.formats || [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    const maxBytes = constraints?.tailleMaxOctets || 3 * 1024 * 1024;

    if (!allowedFormats.includes(file.type)) {
      this.photoError.set(
        this.site.localize(
          copy(
            'La photo doit être au format JPG, PNG ou WEBP.',
            'The photo must be a JPG, PNG, or WEBP file.',
            'يجب أن تكون الصورة بصيغة JPG أو PNG أو WEBP.',
          ),
        ),
      );
      input.value = '';
      return;
    }

    if (file.size > maxBytes) {
      const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
      this.photoError.set(
        this.site.localize(
          copy(
            `La photo dépasse la taille maximale autorisée de ${maxMb} Mo.`,
            `The photo exceeds the maximum allowed size of ${maxMb} MB.`,
            `الصورة تتجاوز الحجم الأقصى المسموح به وهو ${maxMb} ميغابايت.`,
          ),
        ),
      );
      input.value = '';
      return;
    }

    this.photoFile = file;
    this.selectedPhotoName.set(file.name);
    this.replacePreviewPhotoUrl(URL.createObjectURL(file));
  }

  clearSelectedPhoto() {
    this.photoFile = null;
    this.selectedPhotoName.set('');
    this.photoError.set('');
    this.replacePreviewPhotoUrl(null);
  }

  handleAttestationSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    this.attestationFile = input.files?.[0] || null;
    this.selectedAttestationName.set(this.attestationFile?.name || '');
  }

  async uploadSelectedPhoto() {
    const token = this.auth.session()?.accessToken;

    if (!token || !this.photoFile) {
      return;
    }

    this.uploadingPhoto.set(true);
    this.photoMessage.set('');
    this.photoError.set('');

    try {
      const response = await api.uploadMyProfilePhoto(token, this.photoFile);
      this.applyProfileResponse(response);
      this.clearSelectedPhoto();
      await this.auth.refreshProfile();
      this.photoMessage.set(
        this.site.localize(
          copy(
            'La photo de profil a été mise à jour.',
            'Your profile photo has been updated.',
            'تم تحديث صورة الملف الشخصي.',
          ),
        ),
      );
    } catch (error) {
      this.photoError.set(
        this.resolveErrorMessage(
          error,
          copy(
            'Impossible de mettre à jour la photo de profil.',
            'Unable to update the profile photo.',
            'تعذر تحديث صورة الملف الشخصي.',
          ),
        ),
      );
    } finally {
      this.uploadingPhoto.set(false);
    }
  }

  async deletePhoto() {
    const token = this.auth.session()?.accessToken;

    if (!token) {
      return;
    }

    this.removingPhoto.set(true);
    this.photoMessage.set('');
    this.photoError.set('');

    try {
      const response = await api.deleteMyProfilePhoto(token);
      this.applyProfileResponse(response);
      this.clearSelectedPhoto();
      await this.auth.refreshProfile();
      this.photoMessage.set(
        this.site.localize(
          copy(
            'La photo de profil a été supprimée.',
            'The profile photo has been removed.',
            'تم حذف صورة الملف الشخصي.',
          ),
        ),
      );
    } catch (error) {
      this.photoError.set(
        this.resolveErrorMessage(
          error,
          copy(
            'Impossible de supprimer la photo de profil.',
            'Unable to remove the profile photo.',
            'تعذر حذف صورة الملف الشخصي.',
          ),
        ),
      );
    } finally {
      this.removingPhoto.set(false);
    }
  }

  async downloadDoctorantAttestation() {
    const token = this.auth.session()?.accessToken;

    if (!token) {
      return;
    }

    try {
      await api.downloadMyDoctorantAttestation(token);
    } catch (error) {
      this.saveError.set(
        this.resolveErrorMessage(
          error,
          copy(
            'Le téléchargement de l’attestation a échoué.',
            'The attestation download failed.',
            'فشل تنزيل الشهادة.',
          ),
        ),
      );
    }
  }

  async saveProfile() {
    const token = this.auth.session()?.accessToken;

    if (!token) {
      return;
    }

    this.saveMessage.set('');
    this.saveError.set('');
    this.photoMessage.set('');

    const errors = this.validateForm();
    this.errors.set(errors);

    if (Object.keys(errors).length) {
      this.saveError.set(
        this.site.localize(
          copy(
            'Complétez les champs requis avant d’enregistrer.',
            'Please complete the required fields before saving.',
            'يرجى استكمال الحقول المطلوبة قبل الحفظ.',
          ),
        ),
      );
      return;
    }

    this.savingProfile.set(true);

    try {
      const payload = new FormData();
      appendRegistrationPayloadToFormData(payload, this.form, {
        includeAccountFields: false,
      });

      if (this.attestationFile) {
        payload.set('attestationDoctorant', this.attestationFile);
      }

      const response = await api.updateProfile(token, payload);
      this.applyProfileResponse(response);
      this.attestationFile = null;
      this.selectedAttestationName.set('');
      await this.auth.refreshProfile();
      this.saveMessage.set(
        this.site.localize(
          copy(
            'Votre profil a été mis à jour avec succès.',
            'Your profile has been updated successfully.',
            'تم تحديث ملفك الشخصي بنجاح.',
          ),
        ),
      );
    } catch (error) {
      this.saveError.set(
        this.resolveErrorMessage(
          error,
          copy(
            'La mise à jour du profil a échoué.',
            'The profile update failed.',
            'فشل تحديث الملف الشخصي.',
          ),
        ),
      );
    } finally {
      this.savingProfile.set(false);
    }
  }

  private async loadProfile() {
    const token = this.auth.session()?.accessToken;

    if (!token) {
      return;
    }

    this.loadingPage.set(true);
    this.saveError.set('');

    try {
      const response = await api.getProfile(token);
      this.applyProfileResponse(response);
    } catch (error) {
      this.saveError.set(
        this.resolveErrorMessage(
          error,
          copy(
            'Le profil n’a pas pu être chargé.',
            'The profile could not be loaded.',
            'تعذر تحميل الملف الشخصي.',
          ),
        ),
      );
    } finally {
      this.loadingPage.set(false);
    }
  }

  private applyProfileResponse(response: MemberProfileData) {
    this.profileData.set(response);
    this.form = createRegistrationPayloadFromUser(
      response.utilisateur,
      response.references,
    );
    this.errors.set({});
    void this.refreshCurrentPhoto();
  }

  private async refreshCurrentPhoto() {
    const token = this.auth.session()?.accessToken;
    const hasPhoto = Boolean(this.profileData()?.utilisateur?.profil?.photoUrl);
    const requestId = ++this.photoRequestId;

    if (!token || !hasPhoto) {
      this.replaceCurrentPhotoUrl(null);
      return;
    }

    try {
      const blobUrl = await api.getMyProfilePhotoUrl(token);

      if (requestId !== this.photoRequestId) {
        URL.revokeObjectURL(blobUrl);
        return;
      }

      this.replaceCurrentPhotoUrl(blobUrl);
    } catch {
      if (requestId === this.photoRequestId) {
        this.replaceCurrentPhotoUrl(null);
      }
    }
  }

  private replaceCurrentPhotoUrl(nextUrl: string | null) {
    if (this.currentPhotoObjectUrl && this.currentPhotoObjectUrl !== nextUrl) {
      URL.revokeObjectURL(this.currentPhotoObjectUrl);
    }

    this.currentPhotoObjectUrl = nextUrl;
    this.currentPhotoUrl.set(nextUrl);
  }

  private replacePreviewPhotoUrl(nextUrl: string | null) {
    if (this.previewPhotoObjectUrl && this.previewPhotoObjectUrl !== nextUrl) {
      URL.revokeObjectURL(this.previewPhotoObjectUrl);
    }

    this.previewPhotoObjectUrl = nextUrl;
    this.previewPhotoUrl.set(nextUrl);
  }

  private validateForm() {
    const errors: ProfileFormErrors = {};

    if (!this.form.nom.trim()) {
      errors.nom = this.requiredMessage(this.lastNameLabel);
    }
    if (!this.form.prenom.trim()) {
      errors.prenom = this.requiredMessage(this.firstNameLabel);
    }
    if (!this.form.dateNaissance) {
      errors.dateNaissance = this.requiredMessage(this.dateOfBirthLabel);
    }
    if (!this.form.lieuNaissance.trim()) {
      errors.lieuNaissance = this.requiredMessage(this.placeOfBirthLabel);
    }
    if (!this.form.emailInstitutionnel.trim()) {
      errors.emailInstitutionnel = this.requiredMessage(this.institutionalEmailLabel);
    } else if (!this.isValidEmail(this.form.emailInstitutionnel)) {
      errors.emailInstitutionnel = this.site.localize(
        copy(
          'L’adresse email institutionnelle est invalide.',
          'The institutional email address is invalid.',
          'عنوان البريد المؤسسي غير صالح.',
        ),
      );
    }
    if (
      this.form.emailSecondaire.trim() &&
      !this.isValidEmail(this.form.emailSecondaire)
    ) {
      errors.emailSecondaire = this.site.localize(
        copy(
          'L’adresse email secondaire est invalide.',
          'The secondary email address is invalid.',
          'عنوان البريد الثانوي غير صالح.',
        ),
      );
    }
    if (!this.form.telephone.trim()) {
      errors.telephone = this.requiredMessage(this.phoneLabel);
    }
    if (!this.form.grade.trim()) {
      errors.grade = this.requiredMessage(this.gradeLabel);
    }
    if (!this.form.institutionAffectationId) {
      errors.institutionAffectationId = this.requiredMessage(this.institutionLabel);
    }
    if (!this.form.equipeRechercheId) {
      errors.equipeRechercheId = this.requiredMessage(this.teamLabel);
    }
    if (!this.form.dernierDiplomeLibre.trim()) {
      errors.dernierDiplomeLibre = this.requiredMessage(this.lastDegreeLabel);
    }
    if (!this.form.dateObtentionDiplome) {
      errors.dateObtentionDiplome = this.requiredMessage(this.degreeDateLabel);
    }
    if (!this.form.etablissementDiplome.trim()) {
      errors.etablissementDiplome = this.requiredMessage(this.degreeInstitutionLabel);
    }
    if (!this.form.cin.trim() && !this.form.passeport.trim()) {
      const identityMessage = this.site.localize(
        copy(
          'Le CIN ou le passeport est obligatoire.',
          'A national ID or passport is required.',
          'بطاقة التعريف أو جواز السفر مطلوب.',
        ),
      );
      errors.cin = identityMessage;
      errors.passeport = identityMessage;
    }

    if (this.form.estDoctorant) {
      if (!this.form.sujetRecherche.trim()) {
        errors.sujetRecherche = this.requiredMessage(this.researchTopicLabel);
      }
      if (!this.form.pourcentageAvancement.trim()) {
        errors.pourcentageAvancement = this.requiredMessage(this.progressLabel);
      } else {
        const value = Number(this.form.pourcentageAvancement);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          errors.pourcentageAvancement = this.site.localize(
            copy(
              'Le pourcentage d’avancement doit être compris entre 0 et 100.',
              'The progress percentage must be between 0 and 100.',
              'يجب أن تكون نسبة التقدم بين 0 و100.',
            ),
          );
        }
      }
      if (!this.form.anneeUniversitairePremiereInscription.trim()) {
        errors.anneeUniversitairePremiereInscription = this.requiredMessage(
          this.firstRegistrationYearLabel,
        );
      } else if (
        !/^\d{4}\s*\/\s*\d{4}$/.test(
          this.form.anneeUniversitairePremiereInscription.trim(),
        )
      ) {
        errors.anneeUniversitairePremiereInscription = this.site.localize(
          copy(
            'Le format attendu est YYYY/YYYY.',
            'Expected format: YYYY/YYYY.',
            'الصيغة المطلوبة: YYYY/YYYY.',
          ),
        );
      }
      if (!this.form.universiteInscription.trim()) {
        errors.universiteInscription = this.requiredMessage(
          this.universityRegistrationLabel,
        );
      }
      if (!this.form.directeurThese.trim()) {
        errors.directeurThese = this.requiredMessage(this.supervisorLabel);
      }
      if (!this.hasExistingAttestation() && !this.attestationFile) {
        errors.attestationDoctorant = this.site.localize(
          copy(
            'Une attestation doctorant est requise pour ce profil.',
            'A doctoral attestation is required for this profile.',
            'شهادة الدكتوراه مطلوبة لهذا الملف.',
          ),
        );
      }
    }

    return errors;
  }

  private requiredMessage(label: LocalizedCopy) {
    const localizedLabel = this.site.localize(label);
    return this.site.localize(
      copy(
        `${localizedLabel} : champ obligatoire.`,
        `${localizedLabel} is required.`,
        `حقل ${localizedLabel} مطلوب.`,
      ),
    );
  }

  private isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private resolveErrorMessage(error: unknown, fallback: LocalizedCopy) {
    if (error instanceof Error && this.site.language() === 'fr') {
      return error.message;
    }

    return this.site.localize(fallback);
  }
}
