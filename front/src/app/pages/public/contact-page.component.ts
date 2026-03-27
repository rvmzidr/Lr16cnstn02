import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { ContactData } from '../../core/models/models';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner--light surface-card px-8 py-12 lg:px-12">
        <div class="max-w-5xl space-y-6">
          <div class="tag-chip">{{ site.localize(contactTag) }}</div>
          <h1 class="text-5xl font-bold text-foreground lg:text-7xl">
            {{ site.localize(contactTitle) }}
          </h1>
          <p class="text-xl leading-9 text-muted-foreground">
            {{ site.localize(contactIntro) }}
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="grid gap-8 lg:grid-cols-2">
        <div class="surface-card p-8">
          <h2 class="text-3xl font-bold text-foreground">
            {{ site.localize(labDetailsTitle) }}
          </h2>
          <p class="mt-2 text-lg text-muted-foreground">
            {{ site.localize(labDetailsSubtitle) }}
          </p>
          <div class="mt-8 space-y-6">
            <div class="flex gap-4">
              <lucide-icon
                [img]="icons.Mail"
                class="mt-1 h-5 w-5 text-primary"
              ></lucide-icon>
              <div>
                <div class="font-semibold">{{ site.localize(emailLabel) }}</div>
                <div class="text-lg text-muted-foreground">
                  {{ contact()?.email || 'contact@lr16cnstn02.tn' }}
                </div>
              </div>
            </div>
            <div class="flex gap-4">
              <lucide-icon
                [img]="icons.Phone"
                class="mt-1 h-5 w-5 text-primary"
              ></lucide-icon>
              <div>
                <div class="font-semibold">{{ site.localize(phoneLabel) }}</div>
                <div class="text-lg text-muted-foreground">
                  {{ contact()?.telephone || '+216 71 000 000' }}
                </div>
              </div>
            </div>
            <div class="flex gap-4">
              <lucide-icon
                [img]="icons.MapPin"
                class="mt-1 h-5 w-5 text-primary"
              ></lucide-icon>
              <div>
                <div class="font-semibold">
                  {{ site.localize(addressLabel) }}
                </div>
                <div class="text-lg leading-8 text-muted-foreground">
                  {{ contact()?.adresse || site.localize(defaultAddress) }}
                </div>
              </div>
            </div>
          </div>
          <div class="surface-muted mt-8 p-6">
            <div class="text-2xl font-semibold text-foreground">
              {{
                contact()?.institution?.nom || site.localize(defaultInstitution)
              }}
            </div>
            <div class="mt-4 text-lg text-muted-foreground">
              {{ contact()?.horaires || site.localize(defaultHours) }}
            </div>
          </div>
        </div>

        <div class="surface-card p-8">
          <h2 class="text-3xl font-bold text-foreground">
            {{ site.localize(formTitle) }}
          </h2>
          <p class="mt-2 text-lg text-muted-foreground">
            {{ site.localize(formSubtitle) }}
          </p>
          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-2 block font-semibold">{{
                site.localize(fullNameLabel)
              }}</label
              ><input
                [(ngModel)]="form.nomComplet"
                name="nomComplet"
                class="input-shell"
                required
              />
            </div>
            <div>
              <label class="mb-2 block font-semibold">{{
                site.localize(emailLabel)
              }}</label
              ><input
                [(ngModel)]="form.email"
                name="email"
                type="email"
                class="input-shell"
                required
              />
            </div>
            <div>
              <label class="mb-2 block font-semibold">{{
                site.localize(subjectLabel)
              }}</label
              ><input
                [(ngModel)]="form.sujet"
                name="sujet"
                class="input-shell"
                required
              />
            </div>
            <div>
              <label class="mb-2 block font-semibold">{{
                site.localize(messageLabel)
              }}</label
              ><textarea
                [(ngModel)]="form.message"
                name="message"
                class="textarea-shell"
                required
              ></textarea>
            </div>
            @if (successMessage()) {
              <div
                class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success"
              >
                {{ successMessage() }}
              </div>
            }
            @if (errorMessage()) {
              <div
                class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error"
              >
                {{ errorMessage() }}
              </div>
            }
            <button
              type="submit"
              class="btn-secondary"
              [disabled]="isSubmitting()"
            >
              {{
                isSubmitting()
                  ? site.localize(sendingLabel)
                  : site.localize(sendMessageLabel)
              }}
            </button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class ContactPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly contact = signal<ContactData | null>(null);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly form = { nomComplet: '', email: '', sujet: '', message: '' };
  readonly contactTag = { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' };
  readonly contactTitle = { fr: 'Contact', en: 'Contact', ar: 'التواصل' };
  readonly contactIntro = {
    fr: 'Écrivez au laboratoire LR16CNSTN02 pour toute demande d information ou de suivi.',
    en: 'Write to LR16CNSTN02 laboratory for any information or follow-up request.',
    ar: 'راسل مختبر LR16CNSTN02 لأي طلب معلومات أو متابعة.',
  };
  readonly labDetailsTitle = {
    fr: 'Coordonnées du laboratoire',
    en: 'Laboratory contact details',
    ar: 'بيانات الاتصال بالمختبر',
  };
  readonly labDetailsSubtitle = {
    fr: 'Informations publiques de référence',
    en: 'Public reference information',
    ar: 'معلومات مرجعية عمومية',
  };
  readonly emailLabel = { fr: 'Email', en: 'Email', ar: 'البريد الإلكتروني' };
  readonly phoneLabel = { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' };
  readonly addressLabel = { fr: 'Adresse', en: 'Address', ar: 'العنوان' };
  readonly defaultAddress = {
    fr: 'Centre National des Sciences et Technologies Nucléaires, Tunis, Tunisie',
    en: 'National Center for Nuclear Sciences and Technologies, Tunis, Tunisia',
    ar: 'المركز الوطني للعلوم والتكنولوجيا النووية، تونس، تونس',
  };
  readonly defaultInstitution = {
    fr: 'Centre National des Sciences et Technologies Nucléaires',
    en: 'National Center for Nuclear Sciences and Technologies',
    ar: 'المركز الوطني للعلوم والتكنولوجيا النووية',
  };
  readonly defaultHours = {
    fr: 'Du lundi au vendredi, 08:30 - 16:30',
    en: 'Monday to Friday, 08:30 - 16:30',
    ar: 'من الاثنين إلى الجمعة، 08:30 - 16:30',
  };
  readonly formTitle = {
    fr: 'Formulaire de contact',
    en: 'Contact form',
    ar: 'نموذج التواصل',
  };
  readonly formSubtitle = {
    fr: 'Le message est stocké dans la plateforme pour traitement par l équipe.',
    en: 'The message is stored in the platform for team processing.',
    ar: 'يتم حفظ الرسالة في المنصة لمعالجتها من طرف الفريق.',
  };
  readonly fullNameLabel = {
    fr: 'Nom complet',
    en: 'Full name',
    ar: 'الاسم الكامل',
  };
  readonly subjectLabel = { fr: 'Sujet', en: 'Subject', ar: 'الموضوع' };
  readonly messageLabel = { fr: 'Message', en: 'Message', ar: 'الرسالة' };
  readonly sendingLabel = {
    fr: 'Envoi...',
    en: 'Sending...',
    ar: 'جار الإرسال...',
  };
  readonly sendMessageLabel = {
    fr: 'Envoyer le message',
    en: 'Send message',
    ar: 'إرسال الرسالة',
  };

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
      this.successMessage.set(
        this.site.localize({
          fr: 'Votre message a bien été enregistré.',
          en: 'Your message has been successfully recorded.',
          ar: 'تم تسجيل رسالتك بنجاح.',
        }),
      );
      this.form.nomComplet = '';
      this.form.email = '';
      this.form.sujet = '';
      this.form.message = '';
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: "Erreur lors de l'envoi.",
              en: 'Error while sending.',
              ar: 'حدث خطأ أثناء الإرسال.',
            }),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
