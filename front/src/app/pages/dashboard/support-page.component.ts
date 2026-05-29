import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type {
  AccessProfileSummary,
  SupportTicketAccessDiagnostic,
  SupportTicketCategory,
  SupportTicketDetail,
  SupportTicketPriority,
  SupportTicketStats,
  SupportTicketStatus,
  SupportTicketSummary,
} from '../../core/models/models';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';
import { AccessControlService } from '../../shared/services/access-control.service';
import { SupportService } from '../../shared/services/support.service';
import { formatDate } from '../../core/utils/format';

type FilterStatus = SupportTicketStatus | '';
type FilterCategory = SupportTicketCategory | '';
type FilterPriority = SupportTicketPriority | '';

type SupportKpiCard = {
  key: SupportTicketStatus;
  label: string;
  value: number;
  icon: any;
  iconClass: string;
};

@Component({
  selector: 'app-support-page',
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

            <button type="button" class="btn-secondary min-w-[12rem]" (click)="openCreateTicketModal()">
              <lucide-icon [img]="icons.Plus" class="h-4 w-4"></lucide-icon>
              {{ site.localize(newTicketLabel) }}
            </button>
          </div>

          <div class="app-page-pills">
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Total tickets', en: 'Total tickets', ar: 'إجمالي التذاكر' }) }}: {{ stats().total }}
            </span>
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Ouverts', en: 'Open', ar: 'مفتوحة' }) }}: {{ stats().open }}
            </span>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of kpiCards(); track card.key) {
          <article class="surface-card border border-border p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {{ card.label }}
                </p>
                <p class="mt-2 text-3xl font-semibold text-foreground">{{ card.value }}</p>
              </div>
              <span [class]="card.iconClass">
                <lucide-icon [img]="card.icon" class="h-5 w-5"></lucide-icon>
              </span>
            </div>
          </article>
        }
      </section>

      <section class="surface-card p-5 lg:p-6">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div class="relative xl:col-span-2">
            <lucide-icon
              [img]="icons.Search"
              class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            ></lucide-icon>
            <input
              class="input-shell pl-11"
              [placeholder]="site.localize(searchPlaceholder)"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
            />
          </div>

          <select
            class="select-shell"
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event)"
          >
            <option value="">{{ site.localize(allStatusesLabel) }}</option>
            @for (status of statusOptions; track status) {
              <option [value]="status">{{ statusLabel(status) }}</option>
            }
          </select>

          <select
            class="select-shell"
            [ngModel]="categoryFilter()"
            (ngModelChange)="categoryFilter.set($event)"
          >
            <option value="">{{ site.localize(allCategoriesLabel) }}</option>
            @for (category of categoryOptions; track category) {
              <option [value]="category">{{ categoryLabel(category) }}</option>
            }
          </select>

          <select
            class="select-shell"
            [ngModel]="priorityFilter()"
            (ngModelChange)="priorityFilter.set($event)"
          >
            <option value="">{{ site.localize(allPrioritiesLabel) }}</option>
            @for (priority of priorityOptions; track priority) {
              <option [value]="priority">{{ priorityLabel(priority) }}</option>
            }
          </select>

          @if (isAdmin()) {
            <select
              class="select-shell"
              [ngModel]="assignmentFilter()"
              (ngModelChange)="assignmentFilter.set($event)"
            >
              <option value="all">{{ site.localize(assignmentAllLabel) }}</option>
              <option value="mine">{{ site.localize(assignmentMineLabel) }}</option>
              <option value="assigned">{{ site.localize(assignmentAssignedLabel) }}</option>
              <option value="unassigned">{{ site.localize(assignmentUnassignedLabel) }}</option>
            </select>
          }
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="btn-secondary" (click)="applyFilters()" [disabled]="loading()">
            {{ site.localize(applyFiltersLabel) }}
          </button>
          <button type="button" class="btn-outline" (click)="resetFilters()" [disabled]="loading()">
            {{ site.localize(resetFiltersLabel) }}
          </button>
        </div>
      </section>

      <section class="space-y-3">
        @if (loading()) {
          <div class="surface-card p-8 text-sm text-muted-foreground">
            {{ site.localize(loadingTicketsLabel) }}
          </div>
        }

        @for (ticket of tickets(); track ticket.id) {
          <article class="surface-card border border-border p-4 lg:p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div class="min-w-0 flex-1 space-y-2.5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex h-7 items-center rounded-lg border border-border bg-muted px-2.5 text-xs font-semibold text-muted-foreground">
                    #{{ ticket.id }}
                  </span>
                  <span [class]="priorityBadgeClass(ticket.priority)">
                    {{ priorityLabel(ticket.priority) }}
                  </span>
                  <span [class]="statusBadgeClass(ticket.status)">
                    {{ statusLabel(ticket.status) }}
                  </span>
                </div>

                <h3 class="text-lg font-semibold leading-7 text-foreground break-words">{{ ticket.subject }}</h3>

                <div class="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span class="font-medium text-foreground">{{ site.localize(requesterLabel) }}:</span>
                    {{ ticket.requester?.fullName || site.localize(notAvailableLabel) }}
                  </div>
                  <div>
                    <span class="font-medium text-foreground">{{ site.localize(categoryLabelText) }}:</span>
                    {{ categoryLabel(ticket.category) }}
                  </div>
                  <div>
                    <span class="font-medium text-foreground">{{ site.localize(createdAtLabel) }}:</span>
                    {{ formatDate(ticket.createdAt) }}
                  </div>
                  <div>
                    <span class="font-medium text-foreground">{{ site.localize(repliesLabel) }}:</span>
                    {{ ticket.replyCount }}
                  </div>
                </div>
              </div>

              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" class="btn-outline" (click)="openTicketDetail(ticket.id)">
                  {{ site.localize(viewDetailsLabel) }}
                </button>

                @if (isAdmin() && primaryActionLabel(ticket)) {
                  <button
                    type="button"
                    class="btn-secondary"
                    [disabled]="processing()"
                    (click)="runPrimaryAction(ticket)"
                  >
                    {{ primaryActionLabel(ticket) }}
                  </button>
                }
              </div>
            </div>
          </article>
        } @empty {
          @if (!loading()) {
            <div class="empty-state py-12">{{ site.localize(emptyTicketsLabel) }}</div>
          }
        }
      </section>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }
    </div>

    @if (showCreateModal()) {
      <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" (click)="closeCreateTicketModal()">
        <div class="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-elevated" (click)="$event.stopPropagation()">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(newTicketModalTitle) }}</h3>
              <p class="text-sm text-muted-foreground">{{ site.localize(newTicketModalSubtitle) }}</p>
            </div>
            <button type="button" class="btn-outline" (click)="closeCreateTicketModal()">
              {{ site.localize(closeLabel) }}
            </button>
          </div>

          <div class="grid gap-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(subjectLabel) }}</label>
              <input class="input-shell" [ngModel]="newSubject()" (ngModelChange)="newSubject.set($event)" />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(categoryLabelText) }}</label>
                <select class="select-shell" [ngModel]="newCategory()" (ngModelChange)="newCategory.set($event)">
                  @for (category of categoryOptions; track category) {
                    <option [value]="category">{{ categoryLabel(category) }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(priorityLabelText) }}</label>
                <select class="select-shell" [ngModel]="newPriority()" (ngModelChange)="newPriority.set($event)">
                  @for (priority of priorityOptions; track priority) {
                    <option [value]="priority">{{ priorityLabel(priority) }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(descriptionLabel) }}</label>
              <textarea
                class="textarea-shell min-h-32"
                [ngModel]="newDescription()"
                (ngModelChange)="newDescription.set($event)"
              ></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground">{{ site.localize(attachmentLabel) }}</label>
              <input
                type="file"
                class="input-shell file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                (change)="onCreateAttachmentSelected($event)"
              />
              @if (newAttachmentName()) {
                <p class="mt-2 text-xs text-muted-foreground">{{ newAttachmentName() }}</p>
              }
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" class="btn-outline" (click)="closeCreateTicketModal()" [disabled]="creatingTicket()">
              {{ site.localize(cancelLabel) }}
            </button>
            <button type="button" class="btn-secondary" (click)="submitCreateTicket()" [disabled]="creatingTicket()">
              {{ site.localize(createTicketConfirmLabel) }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showDetailModal() && selectedTicketDetail()) {
      <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" (click)="closeTicketDetail()">
        <div class="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-foreground break-words">{{ selectedTicketDetail()!.subject }}</h3>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="inline-flex h-7 items-center rounded-lg border border-border bg-muted px-2.5 text-xs font-semibold text-muted-foreground">
                  #{{ selectedTicketDetail()!.id }}
                </span>
                <span [class]="priorityBadgeClass(selectedTicketDetail()!.priority)">
                  {{ priorityLabel(selectedTicketDetail()!.priority) }}
                </span>
                <span [class]="statusBadgeClass(selectedTicketDetail()!.status)">
                  {{ statusLabel(selectedTicketDetail()!.status) }}
                </span>
              </div>
            </div>

            <button type="button" class="btn-outline" (click)="closeTicketDetail()">
              {{ site.localize(closeLabel) }}
            </button>
          </div>

          <div class="max-h-[calc(92vh-88px)] overflow-y-auto px-5 py-5">
            <div class="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div class="space-y-5">
                <article class="rounded-2xl border border-border bg-card p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(ticketDescriptionLabel) }}</h4>
                  <p class="mt-3 whitespace-pre-line text-sm leading-7 text-foreground">{{ selectedTicketDetail()!.description }}</p>
                </article>

                <article class="rounded-2xl border border-border bg-card p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(repliesHistoryLabel) }}</h4>

                  <div class="mt-4 space-y-3">
                    @for (reply of selectedTicketDetail()!.replies; track reply.id) {
                      <div class="rounded-xl border border-border bg-muted/30 px-3 py-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span class="font-semibold text-foreground">{{ reply.author?.fullName || site.localize(notAvailableLabel) }}</span>
                          <span>{{ formatDate(reply.createdAt) }}</span>
                        </div>

                        @if (reply.isInternalNote) {
                          <div class="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            {{ site.localize(internalNoteLabel) }}
                          </div>
                        }

                        <p class="mt-2 whitespace-pre-line text-sm leading-6 text-foreground">{{ reply.message }}</p>

                        @if (reply.attachments.length) {
                          <div class="mt-3 flex flex-wrap gap-2">
                            @for (attachment of reply.attachments; track attachment.id) {
                              <button type="button" class="btn-outline h-9 px-3 text-xs" (click)="downloadAttachment(attachment.id)">
                                {{ attachment.fileName }}
                              </button>
                            }
                          </div>
                        }
                      </div>
                    } @empty {
                      <div class="empty-state py-8">{{ site.localize(emptyRepliesLabel) }}</div>
                    }
                  </div>
                </article>

                <article class="rounded-2xl border border-border bg-card p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(addReplyLabel) }}</h4>
                  <div class="mt-3 space-y-3">
                    <textarea
                      class="textarea-shell min-h-28"
                      [placeholder]="site.localize(replyPlaceholder)"
                      [ngModel]="replyMessage()"
                      (ngModelChange)="replyMessage.set($event)"
                    ></textarea>

                    <input
                      type="file"
                      class="input-shell file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      (change)="onReplyAttachmentSelected($event)"
                    />

                    @if (replyAttachmentName()) {
                      <p class="text-xs text-muted-foreground">{{ replyAttachmentName() }}</p>
                    }

                    @if (isAdmin()) {
                      <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" class="h-4 w-4" [checked]="replyInternalNote()" (change)="toggleReplyInternalNote($event)" />
                        {{ site.localize(internalNoteCheckboxLabel) }}
                      </label>
                    } @else if (canRequesterReopen(selectedTicketDetail()!)) {
                      <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" class="h-4 w-4" [checked]="replyReopenTicket()" (change)="toggleReplyReopen($event)" />
                        {{ site.localize(reopenTicketCheckboxLabel) }}
                      </label>
                    }

                    <div class="flex justify-end">
                      <button type="button" class="btn-secondary" [disabled]="processing()" (click)="submitReply()">
                        {{ site.localize(sendReplyLabel) }}
                      </button>
                    </div>
                  </div>
                </article>
              </div>

              <div class="space-y-5">
                <article class="rounded-2xl border border-border bg-card p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(ticketMetaLabel) }}</h4>

                  <dl class="mt-3 space-y-2 text-sm">
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">{{ site.localize(requesterLabel) }}</dt>
                      <dd class="text-right text-foreground">{{ selectedTicketDetail()!.requester?.fullName || site.localize(notAvailableLabel) }}</dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">{{ site.localize(roleLabel) }}</dt>
                      <dd class="text-right text-foreground">{{ roleLabelForUser(selectedTicketDetail()!.requester?.role || null) }}</dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">{{ site.localize(categoryLabelText) }}</dt>
                      <dd class="text-right text-foreground">{{ categoryLabel(selectedTicketDetail()!.category) }}</dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">{{ site.localize(priorityLabelText) }}</dt>
                      <dd class="text-right text-foreground">{{ priorityLabel(selectedTicketDetail()!.priority) }}</dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">{{ site.localize(statusLabelText) }}</dt>
                      <dd class="text-right text-foreground">{{ statusLabel(selectedTicketDetail()!.status) }}</dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">{{ site.localize(createdAtLabel) }}</dt>
                      <dd class="text-right text-foreground">{{ formatDate(selectedTicketDetail()!.createdAt) }}</dd>
                    </div>
                  </dl>
                </article>

                <article class="rounded-2xl border border-border bg-card p-4">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(attachmentsLabel) }}</h4>

                  <div class="mt-3 space-y-2">
                    @for (attachment of selectedTicketDetail()!.attachments; track attachment.id) {
                      <button type="button" class="btn-outline w-full justify-start" (click)="downloadAttachment(attachment.id)">
                        {{ attachment.fileName }}
                      </button>
                    } @empty {
                      <div class="empty-state py-6">{{ site.localize(emptyAttachmentsLabel) }}</div>
                    }
                  </div>
                </article>

                @if (isAdmin()) {
                  <article class="rounded-2xl border border-border bg-card p-4">
                    <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {{ site.localize(accessDiagnosticTitle) }}
                    </h4>

                    @if (accessDiagnostic()) {
                      <div class="mt-3 space-y-3 text-sm">
                        <div class="grid gap-2">
                          <div class="flex items-start justify-between gap-3">
                            <span class="text-muted-foreground">{{ site.localize(roleLabel) }}</span>
                            <span class="text-right text-foreground">{{ roleLabelForUser(accessDiagnostic()!.accessContext.user.role) }}</span>
                          </div>
                          <div class="flex items-start justify-between gap-3">
                            <span class="text-muted-foreground">{{ site.localize(accessProfileLabel) }}</span>
                            <span class="text-right text-foreground">{{ accessDiagnostic()!.accessContext.profile?.name || site.localize(notAvailableLabel) }}</span>
                          </div>
                          <div class="flex items-start justify-between gap-3">
                            <span class="text-muted-foreground">{{ site.localize(defaultLandingLabel) }}</span>
                            <span class="text-right text-foreground">{{ accessDiagnostic()!.accessContext.effective.defaultLandingPage }}</span>
                          </div>
                        </div>

                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(visibleModulesLabel) }}</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            @for (moduleKey of accessDiagnostic()!.accessContext.effective.visibleModules; track moduleKey) {
                              <span class="badge-soft">{{ moduleKey }}</span>
                            } @empty {
                              <span class="text-xs text-muted-foreground">{{ site.localize(notAvailableLabel) }}</span>
                            }
                          </div>
                        </div>

                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(majorPermissionsLabel) }}</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            @for (permission of accessDiagnostic()!.accessContext.effective.majorPermissions; track permission.key) {
                              <span class="badge-soft">{{ permission.key }}</span>
                            } @empty {
                              <span class="text-xs text-muted-foreground">{{ site.localize(notAvailableLabel) }}</span>
                            }
                          </div>
                        </div>

                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(overridesLabel) }}</p>
                          <div class="mt-2 space-y-1.5">
                            @for (override of accessDiagnostic()!.accessContext.overrides; track override.id) {
                              <div class="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-foreground">
                                {{ override.overrideType }} • {{ override.key }} = {{ override.value ? site.localize(enabledLabel) : site.localize(disabledLabel) }}
                              </div>
                            } @empty {
                              <div class="text-xs text-muted-foreground">{{ site.localize(noOverridesLabel) }}</div>
                            }
                          </div>
                        </div>

                        <button type="button" class="btn-outline w-full" (click)="openAccessControlFromTicket()">
                          {{ site.localize(openAccessControlLabel) }}
                        </button>

                        <div class="space-y-2 border-t border-border pt-3">
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(applyResolutionLabel) }}</p>

                          <select
                            class="select-shell"
                            [ngModel]="accessResolutionProfileId()"
                            (ngModelChange)="setAccessResolutionProfileId($event)"
                          >
                            <option value="">{{ site.localize(keepProfileLabel) }}</option>
                            @for (profile of accessProfiles(); track profile.id) {
                              <option [value]="profile.id">{{ profile.name }} ({{ roleLabelForUser(profile.parentRole) }})</option>
                            }
                          </select>

                          <select class="select-shell" [ngModel]="accessResolutionMessaging()" (ngModelChange)="accessResolutionMessaging.set($event)">
                            <option value="">{{ site.localize(messagingNoChangeLabel) }}</option>
                            <option value="allow">{{ site.localize(messagingAllowLabel) }}</option>
                            <option value="deny">{{ site.localize(messagingDenyLabel) }}</option>
                          </select>

                          <select class="select-shell" [ngModel]="accessResolutionPurchases()" (ngModelChange)="accessResolutionPurchases.set($event)">
                            <option value="">{{ site.localize(purchasesNoChangeLabel) }}</option>
                            <option value="allow">{{ site.localize(purchasesAllowLabel) }}</option>
                            <option value="deny">{{ site.localize(purchasesDenyLabel) }}</option>
                          </select>

                          <textarea
                            class="textarea-shell min-h-20"
                            [placeholder]="site.localize(resolutionNotesLabel)"
                            [ngModel]="accessResolutionNotes()"
                            (ngModelChange)="accessResolutionNotes.set($event)"
                          ></textarea>

                          <textarea
                            class="textarea-shell min-h-20"
                            [placeholder]="site.localize(resolutionMessageLabel)"
                            [ngModel]="accessResolutionMessage()"
                            (ngModelChange)="accessResolutionMessage.set($event)"
                          ></textarea>

                          <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" class="h-4 w-4" [checked]="accessResolutionCloseTicket()" (change)="toggleAccessResolutionCloseTicket($event)" />
                            {{ site.localize(closeTicketAfterResolutionLabel) }}
                          </label>

                          <button
                            type="button"
                            class="btn-secondary w-full"
                            [disabled]="processing()"
                            (click)="applyAccessResolutionFromSupport()"
                          >
                            {{ site.localize(saveAccessResolutionLabel) }}
                          </button>
                        </div>
                      </div>
                    } @else {
                      <div class="mt-3 text-sm text-muted-foreground">
                        {{ site.localize(accessDiagnosticUnavailableLabel) }}
                      </div>
                    }
                  </article>

                  <article class="rounded-2xl border border-border bg-card p-4">
                    <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(adminActionsLabel) }}</h4>

                    <div class="mt-3 grid gap-2">
                      @if (selectedTicketDetail()!.status === 'OPEN') {
                        <button type="button" class="btn-secondary" [disabled]="processing()" (click)="assignTicketToMe()">
                          {{ site.localize(takeOwnershipLabel) }}
                        </button>
                      }

                      @if (selectedTicketDetail()!.status !== 'IN_PROGRESS') {
                        <button type="button" class="btn-outline" [disabled]="processing()" (click)="setDetailTicketStatus('IN_PROGRESS')">
                          {{ statusLabel('IN_PROGRESS') }}
                        </button>
                      }

                      @if (selectedTicketDetail()!.status !== 'RESOLVED') {
                        <button type="button" class="btn-outline" [disabled]="processing()" (click)="setDetailTicketStatus('RESOLVED')">
                          {{ statusLabel('RESOLVED') }}
                        </button>
                      }

                      @if (selectedTicketDetail()!.status !== 'CLOSED') {
                        <button type="button" class="btn-outline" [disabled]="processing()" (click)="setDetailTicketStatus('CLOSED')">
                          {{ statusLabel('CLOSED') }}
                        </button>
                      }

                      @if (selectedTicketDetail()!.status !== 'OPEN') {
                        <button type="button" class="btn-outline" [disabled]="processing()" (click)="setDetailTicketStatus('OPEN')">
                          {{ site.localize(reopenLabel) }}
                        </button>
                      }
                    </div>
                  </article>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class SupportPageComponent implements OnInit {
  readonly site = inject(SitePreferencesService);
  readonly support = inject(SupportService);
  readonly accessControl = inject(AccessControlService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly icons = sharedIcons;
  readonly formatDate = formatDate;

  readonly isAdmin = this.support.isAdmin;

  readonly loading = signal(false);
  readonly processing = signal(false);
  readonly creatingTicket = signal(false);

  readonly tickets = signal<SupportTicketSummary[]>([]);
  readonly stats = signal<SupportTicketStats>({
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  });

  readonly selectedTicketDetail = signal<SupportTicketDetail | null>(null);
  readonly accessDiagnostic = signal<SupportTicketAccessDiagnostic | null>(null);
  readonly accessProfiles = signal<AccessProfileSummary[]>([]);
  readonly showDetailModal = signal(false);
  readonly showCreateModal = signal(false);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<FilterStatus>('');
  readonly categoryFilter = signal<FilterCategory>('');
  readonly priorityFilter = signal<FilterPriority>('');
  readonly assignmentFilter = signal<'all' | 'mine' | 'assigned' | 'unassigned'>('all');

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');

  readonly newSubject = signal('');
  readonly newCategory = signal<SupportTicketCategory>('SYSTEM');
  readonly newPriority = signal<SupportTicketPriority>('MEDIUM');
  readonly newDescription = signal('');
  readonly newAttachment = signal<File | null>(null);
  readonly newAttachmentName = signal('');

  readonly replyMessage = signal('');
  readonly replyAttachment = signal<File | null>(null);
  readonly replyAttachmentName = signal('');
  readonly replyInternalNote = signal(false);
  readonly replyReopenTicket = signal(false);
  readonly accessResolutionProfileId = signal<number | ''>('');
  readonly accessResolutionNotes = signal('');
  readonly accessResolutionMessage = signal('');
  readonly accessResolutionCloseTicket = signal(true);
  readonly accessResolutionMessaging = signal<'' | 'allow' | 'deny'>('');
  readonly accessResolutionPurchases = signal<'' | 'allow' | 'deny'>('');

  readonly statusOptions: SupportTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  readonly categoryOptions: SupportTicketCategory[] = [
    'LOGIN',
    'ACCOUNT',
    'ACCESS',
    'ROLE',
    'MODULE_VISIBILITY',
    'PERMISSION',
    'UI_BUG',
    'TRANSLATION',
    'MESSAGING',
    'NOTIFICATIONS',
    'ARTICLES',
    'SYSTEM',
    'OTHER',
  ];
  readonly priorityOptions: SupportTicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  readonly pageTitle = {
    fr: 'Centre de Support',
    en: 'Support Center',
    ar: 'مركز الدعم',
  };
  readonly pageEyebrow = {
    fr: 'Centre assistance',
    en: 'Support center',
    ar: 'مركز الدعم',
  };
  readonly pageDescription = {
    fr: "Gestion des tickets d'assistance technique",
    en: 'Technical support ticket management',
    ar: 'إدارة تذاكر المساندة التقنية',
  };
  readonly newTicketLabel = {
    fr: 'Nouveau ticket',
    en: 'New ticket',
    ar: 'تذكرة جديدة',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher par sujet ou demandeur...',
    en: 'Search by subject or requester...',
    ar: 'ابحث حسب الموضوع أو صاحب الطلب...',
  };
  readonly allStatusesLabel = {
    fr: 'Tous les statuts',
    en: 'All statuses',
    ar: 'كل الحالات',
  };
  readonly allCategoriesLabel = {
    fr: 'Toutes les catégories',
    en: 'All categories',
    ar: 'كل الفئات',
  };
  readonly allPrioritiesLabel = {
    fr: 'Toutes les priorités',
    en: 'All priorities',
    ar: 'كل الأولويات',
  };
  readonly assignmentAllLabel = { fr: 'Toutes assignations', en: 'All assignments', ar: 'كل الإسنادات' };
  readonly assignmentMineLabel = { fr: 'Mes tickets', en: 'My tickets', ar: 'تذاكري' };
  readonly assignmentAssignedLabel = { fr: 'Assignés', en: 'Assigned', ar: 'مسندة' };
  readonly assignmentUnassignedLabel = { fr: 'Non assignés', en: 'Unassigned', ar: 'غير مسندة' };
  readonly applyFiltersLabel = { fr: 'Appliquer', en: 'Apply', ar: 'تطبيق' };
  readonly resetFiltersLabel = { fr: 'Réinitialiser', en: 'Reset', ar: 'إعادة تعيين' };
  readonly loadingTicketsLabel = {
    fr: 'Chargement des tickets support...',
    en: 'Loading support tickets...',
    ar: 'جار تحميل تذاكر الدعم...',
  };
  readonly requesterLabel = { fr: 'Demandeur', en: 'Requester', ar: 'صاحب الطلب' };
  readonly categoryLabelText = { fr: 'Catégorie', en: 'Category', ar: 'الفئة' };
  readonly createdAtLabel = { fr: 'Créé le', en: 'Created on', ar: 'تاريخ الإنشاء' };
  readonly repliesLabel = { fr: 'Réponses', en: 'Replies', ar: 'الردود' };
  readonly viewDetailsLabel = { fr: 'Voir détails', en: 'View details', ar: 'عرض التفاصيل' };
  readonly emptyTicketsLabel = {
    fr: 'Aucun ticket trouvé pour les filtres actuels.',
    en: 'No ticket found for current filters.',
    ar: 'لا توجد تذاكر وفق الفلاتر الحالية.',
  };
  readonly newTicketModalTitle = {
    fr: "Création d'un ticket support",
    en: 'Create a support ticket',
    ar: 'إنشاء تذكرة دعم',
  };
  readonly newTicketModalSubtitle = {
    fr: 'Décrivez clairement le problème technique rencontré.',
    en: 'Clearly describe the technical issue encountered.',
    ar: 'صف المشكلة التقنية بوضوح.',
  };
  readonly closeLabel = { fr: 'Fermer', en: 'Close', ar: 'إغلاق' };
  readonly cancelLabel = { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' };
  readonly subjectLabel = { fr: 'Sujet', en: 'Subject', ar: 'الموضوع' };
  readonly priorityLabelText = { fr: 'Priorité', en: 'Priority', ar: 'الأولوية' };
  readonly descriptionLabel = { fr: 'Description', en: 'Description', ar: 'الوصف' };
  readonly attachmentLabel = { fr: 'Pièce jointe (optionnelle)', en: 'Attachment (optional)', ar: 'مرفق (اختياري)' };
  readonly createTicketConfirmLabel = { fr: 'Créer le ticket', en: 'Create ticket', ar: 'إنشاء التذكرة' };
  readonly ticketDescriptionLabel = { fr: 'Description du ticket', en: 'Ticket description', ar: 'وصف التذكرة' };
  readonly repliesHistoryLabel = { fr: 'Historique des réponses', en: 'Reply history', ar: 'سجل الردود' };
  readonly addReplyLabel = { fr: 'Ajouter une réponse', en: 'Add a reply', ar: 'إضافة رد' };
  readonly replyPlaceholder = {
    fr: 'Saisissez votre réponse...',
    en: 'Type your reply...',
    ar: 'اكتب ردك...',
  };
  readonly internalNoteLabel = { fr: 'Note interne', en: 'Internal note', ar: 'ملاحظة داخلية' };
  readonly internalNoteCheckboxLabel = {
    fr: 'Rendre cette réponse visible uniquement aux administrateurs',
    en: 'Make this reply visible to administrators only',
    ar: 'اجعل هذا الرد مرئياً للمسؤولين فقط',
  };
  readonly reopenTicketCheckboxLabel = {
    fr: 'Rouvrir ce ticket',
    en: 'Reopen this ticket',
    ar: 'إعادة فتح هذه التذكرة',
  };
  readonly sendReplyLabel = { fr: 'Envoyer la réponse', en: 'Send reply', ar: 'إرسال الرد' };
  readonly ticketMetaLabel = { fr: 'Informations ticket', en: 'Ticket details', ar: 'معلومات التذكرة' };
  readonly roleLabel = { fr: 'Rôle', en: 'Role', ar: 'الدور' };
  readonly statusLabelText = { fr: 'Statut', en: 'Status', ar: 'الحالة' };
  readonly attachmentsLabel = { fr: 'Pièces jointes', en: 'Attachments', ar: 'المرفقات' };
  readonly emptyRepliesLabel = { fr: 'Aucune réponse pour le moment.', en: 'No replies yet.', ar: 'لا توجد ردود بعد.' };
  readonly emptyAttachmentsLabel = { fr: 'Aucune pièce jointe.', en: 'No attachments.', ar: 'لا توجد مرفقات.' };
  readonly adminActionsLabel = { fr: 'Actions administrateur', en: 'Admin actions', ar: 'إجراءات المسؤول' };
  readonly accessDiagnosticTitle = {
    fr: 'Diagnostic des accès',
    en: 'Access diagnostics',
    ar: 'تشخيص الوصول',
  };
  readonly accessProfileLabel = { fr: "Profil d'accès", en: 'Access profile', ar: 'ملف الوصول' };
  readonly defaultLandingLabel = {
    fr: "Page d'accueil",
    en: 'Default landing',
    ar: 'صفحة الهبوط الافتراضية',
  };
  readonly visibleModulesLabel = {
    fr: 'Modules visibles',
    en: 'Visible modules',
    ar: 'الوحدات الظاهرة',
  };
  readonly majorPermissionsLabel = {
    fr: 'Permissions majeures',
    en: 'Major permissions',
    ar: 'الصلاحيات الرئيسية',
  };
  readonly overridesLabel = { fr: 'Overrides', en: 'Overrides', ar: 'الاستثناءات' };
  readonly noOverridesLabel = {
    fr: 'Aucun override appliqué.',
    en: 'No override applied.',
    ar: 'لا توجد استثناءات مطبقة.',
  };
  readonly enabledLabel = { fr: 'Actif', en: 'Enabled', ar: 'مفعل' };
  readonly disabledLabel = { fr: 'Inactif', en: 'Disabled', ar: 'غير مفعل' };
  readonly openAccessControlLabel = {
    fr: "Ouvrir contrôle d'accès",
    en: 'Open access control',
    ar: 'فتح التحكم في الوصول',
  };
  readonly applyResolutionLabel = {
    fr: 'Appliquer une résolution',
    en: 'Apply resolution',
    ar: 'تطبيق معالجة',
  };
  readonly keepProfileLabel = {
    fr: 'Conserver profil actuel',
    en: 'Keep current profile',
    ar: 'الاحتفاظ بالملف الحالي',
  };
  readonly messagingNoChangeLabel = {
    fr: 'Messagerie: aucun changement',
    en: 'Messaging: no change',
    ar: 'المراسلة: بدون تغيير',
  };
  readonly messagingAllowLabel = {
    fr: 'Messagerie: autoriser',
    en: 'Messaging: allow',
    ar: 'المراسلة: سماح',
  };
  readonly messagingDenyLabel = {
    fr: 'Messagerie: bloquer',
    en: 'Messaging: deny',
    ar: 'المراسلة: منع',
  };
  readonly purchasesNoChangeLabel = {
    fr: 'Achats: aucun changement',
    en: 'Purchases: no change',
    ar: 'المشتريات: بدون تغيير',
  };
  readonly purchasesAllowLabel = {
    fr: 'Achats: autoriser',
    en: 'Purchases: allow',
    ar: 'المشتريات: سماح',
  };
  readonly purchasesDenyLabel = {
    fr: 'Achats: bloquer',
    en: 'Purchases: deny',
    ar: 'المشتريات: منع',
  };
  readonly resolutionNotesLabel = {
    fr: 'Notes de résolution (interne)',
    en: 'Resolution notes (internal)',
    ar: 'ملاحظات المعالجة (داخلية)',
  };
  readonly resolutionMessageLabel = {
    fr: 'Message réponse ticket',
    en: 'Ticket reply message',
    ar: 'رسالة الرد على التذكرة',
  };
  readonly closeTicketAfterResolutionLabel = {
    fr: 'Marquer le ticket comme résolu après correction',
    en: 'Mark ticket as resolved after applying fix',
    ar: 'وضع التذكرة كـ محلولة بعد التصحيح',
  };
  readonly saveAccessResolutionLabel = {
    fr: 'Enregistrer résolution accès',
    en: 'Save access resolution',
    ar: 'حفظ معالجة الوصول',
  };
  readonly accessDiagnosticUnavailableLabel = {
    fr: "Diagnostic d'accès indisponible pour ce ticket.",
    en: 'Access diagnostics unavailable for this ticket.',
    ar: 'تشخيص الوصول غير متاح لهذه التذكرة.',
  };
  readonly takeOwnershipLabel = { fr: 'Prendre en charge', en: 'Take ownership', ar: 'تولي المعالجة' };
  readonly reopenLabel = { fr: 'Rouvrir', en: 'Reopen', ar: 'إعادة فتح' };
  readonly notAvailableLabel = { fr: 'N/A', en: 'N/A', ar: 'غير متاح' };

  readonly kpiCards = computed<SupportKpiCard[]>(() => {
    const s = this.stats();

    return [
      {
        key: 'OPEN',
        label: this.statusLabel('OPEN'),
        value: s.open,
        icon: this.icons.LifeBuoy,
        iconClass:
          'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700',
      },
      {
        key: 'IN_PROGRESS',
        label: this.statusLabel('IN_PROGRESS'),
        value: s.inProgress,
        icon: this.icons.Headphones,
        iconClass:
          'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700',
      },
      {
        key: 'RESOLVED',
        label: this.statusLabel('RESOLVED'),
        value: s.resolved,
        icon: this.icons.Check,
        iconClass:
          'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700',
      },
      {
        key: 'CLOSED',
        label: this.statusLabel('CLOSED'),
        value: s.closed,
        icon: this.icons.Lock,
        iconClass:
          'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-slate-700',
      },
    ];
  });

  async ngOnInit() {
    if (this.isAdmin()) {
      await this.loadAccessProfiles();
    }

    await this.applyFilters();

    const ticketId = Number(this.route.snapshot.queryParamMap.get('ticketId') || 0);
    if (ticketId > 0) {
      await this.openTicketDetail(ticketId);
    }
  }

  private async loadAccessProfiles() {
    if (!this.isAdmin()) {
      this.accessProfiles.set([]);
      return;
    }

    try {
      const response = await this.accessControl.listProfiles({ page: 1, limit: 50, active: true });
      this.accessProfiles.set(response.elements || []);
    } catch {
      this.accessProfiles.set([]);
    }
  }

  private async loadAccessDiagnostic(ticketId: number) {
    if (!this.isAdmin()) {
      this.accessDiagnostic.set(null);
      return;
    }

    try {
      const diagnostic = await this.support.getTicketAccessDiagnostic(ticketId);
      this.accessDiagnostic.set(diagnostic);

      this.accessResolutionProfileId.set(diagnostic.accessContext.profile?.id || '');
      this.accessResolutionNotes.set('');
      this.accessResolutionMessage.set('');
      this.accessResolutionCloseTicket.set(true);
      this.accessResolutionMessaging.set('');
      this.accessResolutionPurchases.set('');
    } catch {
      this.accessDiagnostic.set(null);
    }
  }

  private computeStatsFromTickets(tickets: SupportTicketSummary[]) {
    const stats = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      total: tickets.length,
    };

    for (const item of tickets) {
      if (item.status === 'OPEN') {
        stats.open += 1;
      } else if (item.status === 'IN_PROGRESS') {
        stats.inProgress += 1;
      } else if (item.status === 'RESOLVED') {
        stats.resolved += 1;
      } else if (item.status === 'CLOSED') {
        stats.closed += 1;
      }
    }

    return stats;
  }

  private async refreshStats() {
    if (this.isAdmin()) {
      const stats = await this.support.getAdminStats();
      this.stats.set(stats);
      return;
    }

    this.stats.set(this.computeStatsFromTickets(this.tickets()));
  }

  async applyFilters() {
    this.loading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      const response = await this.support.listTickets({
        q: this.searchTerm().trim() || undefined,
        statut: this.statusFilter() || undefined,
        categorie: this.categoryFilter() || undefined,
        priorite: this.priorityFilter() || undefined,
        assignation: this.assignmentFilter(),
        page: 1,
        limit: 50,
      });

      this.tickets.set(response.elements || []);
      await this.refreshStats();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur de chargement des tickets support.',
              en: 'Failed to load support tickets.',
              ar: 'تعذر تحميل تذاكر الدعم.',
            }),
      );
      this.tickets.set([]);
      this.stats.set({ open: 0, inProgress: 0, resolved: 0, closed: 0, total: 0 });
    } finally {
      this.loading.set(false);
    }
  }

  async resetFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.categoryFilter.set('');
    this.priorityFilter.set('');
    this.assignmentFilter.set('all');
    await this.applyFilters();
  }

  openCreateTicketModal() {
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.newSubject.set('');
    this.newCategory.set('SYSTEM');
    this.newPriority.set('MEDIUM');
    this.newDescription.set('');
    this.newAttachment.set(null);
    this.newAttachmentName.set('');
    this.showCreateModal.set(true);
  }

  closeCreateTicketModal() {
    this.showCreateModal.set(false);
  }

  onCreateAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.newAttachment.set(file);
    this.newAttachmentName.set(file?.name || '');
  }

  async submitCreateTicket() {
    const subject = this.newSubject().trim();
    const description = this.newDescription().trim();

    if (!subject || !description) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Sujet et description sont obligatoires.',
          en: 'Subject and description are required.',
          ar: 'الموضوع والوصف مطلوبان.',
        }),
      );
      return;
    }

    this.creatingTicket.set(true);
    this.errorMessage.set('');

    try {
      await this.support.createTicket({
        sujet: subject,
        categorie: this.newCategory(),
        priorite: this.newPriority(),
        description,
        attachment: this.newAttachment(),
      });

      this.showCreateModal.set(false);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Ticket support créé avec succès.',
          en: 'Support ticket created successfully.',
          ar: 'تم إنشاء تذكرة الدعم بنجاح.',
        }),
      );
      await this.applyFilters();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Création ticket impossible.',
              en: 'Failed to create ticket.',
              ar: 'تعذر إنشاء التذكرة.',
            }),
      );
    } finally {
      this.creatingTicket.set(false);
    }
  }

  async openTicketDetail(ticketId: number) {
    this.processing.set(true);
    this.errorMessage.set('');

    try {
      const detail = await this.support.getTicketDetail(ticketId);
      this.selectedTicketDetail.set(detail);
      this.replyMessage.set('');
      this.replyAttachment.set(null);
      this.replyAttachmentName.set('');
      this.replyInternalNote.set(false);
      this.replyReopenTicket.set(false);
      await this.loadAccessDiagnostic(ticketId);
      this.showDetailModal.set(true);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Chargement du détail ticket impossible.',
              en: 'Failed to load ticket detail.',
              ar: 'تعذر تحميل تفاصيل التذكرة.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  closeTicketDetail() {
    this.showDetailModal.set(false);
    this.selectedTicketDetail.set(null);
    this.accessDiagnostic.set(null);
  }

  canRequesterReopen(ticket: SupportTicketDetail) {
    return ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  }

  onReplyAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.replyAttachment.set(file);
    this.replyAttachmentName.set(file?.name || '');
  }

  toggleReplyInternalNote(event: Event) {
    const input = event.target as HTMLInputElement;
    this.replyInternalNote.set(Boolean(input.checked));
  }

  toggleReplyReopen(event: Event) {
    const input = event.target as HTMLInputElement;
    this.replyReopenTicket.set(Boolean(input.checked));
  }

  setAccessResolutionProfileId(value: string | number) {
    if (value === '' || value === null || value === undefined) {
      this.accessResolutionProfileId.set('');
      return;
    }

    const parsedValue =
      typeof value === 'number' ? value : Number.parseInt(String(value), 10);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      this.accessResolutionProfileId.set('');
      return;
    }

    this.accessResolutionProfileId.set(parsedValue);
  }

  toggleAccessResolutionCloseTicket(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.accessResolutionCloseTicket.set(Boolean(input?.checked));
  }

  async submitReply() {
    const ticket = this.selectedTicketDetail();
    if (!ticket) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      const message = this.replyMessage().trim();

      if (this.isAdmin()) {
        const updated = await this.support.addReplyAsAdmin({
          ticketId: ticket.id,
          message,
          attachment: this.replyAttachment(),
          estNoteInterne: this.replyInternalNote(),
        });
        this.selectedTicketDetail.set(updated);
      } else {
        const updated = await this.support.addReplyAsRequester({
          ticketId: ticket.id,
          message,
          attachment: this.replyAttachment(),
          rouvrirTicket: this.replyReopenTicket(),
        });
        this.selectedTicketDetail.set(updated);
      }

      this.replyMessage.set('');
      this.replyAttachment.set(null);
      this.replyAttachmentName.set('');
      this.replyInternalNote.set(false);
      this.replyReopenTicket.set(false);

      this.statusMessage.set(
        this.site.localize({
          fr: 'Réponse enregistrée avec succès.',
          en: 'Reply saved successfully.',
          ar: 'تم حفظ الرد بنجاح.',
        }),
      );

      await this.applyFilters();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Envoi de reponse impossible.',
              en: 'Unable to send reply.',
              ar: 'تعذر إرسال الرد.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  async downloadAttachment(attachmentId: number) {
    try {
      await this.support.downloadAttachment(attachmentId);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Téléchargement pièce jointe impossible.',
              en: 'Unable to download attachment.',
              ar: 'تعذر تنزيل المرفق.',
            }),
      );
    }
  }

  openAccessControlFromTicket() {
    const diagnostic = this.accessDiagnostic();
    if (!diagnostic) {
      return;
    }

    void this.router.navigate(['/dashboard/user-access'], {
      queryParams: {
        userId: diagnostic.accessContext.user.id,
        ticketId: diagnostic.ticket.id,
      },
    });
  }

  async applyAccessResolutionFromSupport() {
    const ticket = this.selectedTicketDetail();
    if (!ticket || !this.isAdmin()) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      const moduleOverrides: Array<{ moduleKey: string; value: boolean; reason?: string }> = [];

      if (this.accessResolutionMessaging() === 'allow') {
        moduleOverrides.push({
          moduleKey: 'messaging',
          value: true,
          reason: 'Resolution ticket support acces messagerie',
        });
      } else if (this.accessResolutionMessaging() === 'deny') {
        moduleOverrides.push({
          moduleKey: 'messaging',
          value: false,
          reason: 'Resolution ticket support acces messagerie',
        });
      }

      if (this.accessResolutionPurchases() === 'allow') {
        moduleOverrides.push({
          moduleKey: 'purchases',
          value: true,
          reason: 'Resolution ticket support acces achats',
        });
      } else if (this.accessResolutionPurchases() === 'deny') {
        moduleOverrides.push({
          moduleKey: 'purchases',
          value: false,
          reason: 'Resolution ticket support acces achats',
        });
      }

      await this.support.resolveTicketAccess(ticket.id, {
        assignProfileId:
          this.accessResolutionProfileId() === ''
            ? undefined
            : Number(this.accessResolutionProfileId()),
        replace: moduleOverrides.length > 0,
        moduleOverrides,
        notes: this.accessResolutionNotes().trim() || undefined,
        responseMessage: this.accessResolutionMessage().trim() || undefined,
        closeTicket: this.accessResolutionCloseTicket(),
      });

      await this.openTicketDetail(ticket.id);
      await this.applyFilters();

      this.statusMessage.set(
        this.site.localize({
          fr: "Résolution d'accès liée au ticket enregistrée.",
          en: 'Access resolution linked to the ticket has been saved.',
          ar: 'تم حفظ معالجة الوصول وربطها بالتذكرة.',
        }),
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: "Impossible d'enregistrer la resolution d'acces.",
              en: 'Unable to save access resolution.',
              ar: 'تعذر حفظ معالجة الوصول.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  primaryActionLabel(ticket: SupportTicketSummary) {
    if (ticket.status === 'OPEN') {
      return this.site.localize(this.takeOwnershipLabel);
    }

    if (ticket.status === 'IN_PROGRESS') {
      return this.statusLabel('RESOLVED');
    }

    if (ticket.status === 'RESOLVED') {
      return this.statusLabel('CLOSED');
    }

    if (ticket.status === 'CLOSED') {
      return this.site.localize(this.reopenLabel);
    }

    return '';
  }

  async runPrimaryAction(ticket: SupportTicketSummary) {
    this.processing.set(true);
    this.errorMessage.set('');

    try {
      if (ticket.status === 'OPEN') {
        await this.support.assignTicket(ticket.id);
      } else if (ticket.status === 'IN_PROGRESS') {
        await this.support.updateStatus(ticket.id, 'RESOLVED');
      } else if (ticket.status === 'RESOLVED') {
        await this.support.updateStatus(ticket.id, 'CLOSED');
      } else if (ticket.status === 'CLOSED') {
        await this.support.updateStatus(ticket.id, 'OPEN');
      }

      this.statusMessage.set(
        this.site.localize({
          fr: 'Action support appliquée.',
          en: 'Support action applied.',
          ar: 'تم تنفيذ إجراء الدعم.',
        }),
      );

      await this.applyFilters();

      if (this.showDetailModal() && this.selectedTicketDetail()?.id === ticket.id) {
        await this.openTicketDetail(ticket.id);
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Action support impossible.',
              en: 'Unable to apply support action.',
              ar: 'تعذر تنفيذ إجراء الدعم.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  async assignTicketToMe() {
    const ticket = this.selectedTicketDetail();
    if (!ticket) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.support.assignTicket(ticket.id);
      this.selectedTicketDetail.set(updated);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Ticket pris en charge.',
          en: 'Ticket assigned.',
          ar: 'تم تولي التذكرة.',
        }),
      );
      await this.applyFilters();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Assignation impossible.',
              en: 'Unable to assign ticket.',
              ar: 'تعذر إسناد التذكرة.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  async setDetailTicketStatus(status: SupportTicketStatus) {
    const ticket = this.selectedTicketDetail();
    if (!ticket) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.support.updateStatus(ticket.id, status);
      this.selectedTicketDetail.set(updated);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Statut ticket mis à jour.',
          en: 'Ticket status updated.',
          ar: 'تم تحديث حالة التذكرة.',
        }),
      );
      await this.applyFilters();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Mise à jour statut impossible.',
              en: 'Unable to update ticket status.',
              ar: 'تعذر تحديث حالة التذكرة.',
            }),
      );
    } finally {
      this.processing.set(false);
    }
  }

  roleLabelForUser(role: string | null) {
    if (role === 'ADMINISTRATEUR') {
      return this.site.localize({ fr: 'Administrateur', en: 'Administrator', ar: 'مسؤول' });
    }

    if (role === 'CHEF_LABO') {
      return this.site.localize({ fr: 'Chef de labo', en: 'Lab head', ar: 'رئيس المختبر' });
    }

    if (role === 'MEMBRE') {
      return this.site.localize({ fr: 'Membre', en: 'Member', ar: 'عضو' });
    }

    return this.site.localize(this.notAvailableLabel);
  }

  statusLabel(status: SupportTicketStatus) {
    if (status === 'OPEN') {
      return this.site.localize({ fr: 'Ouvert', en: 'Open', ar: 'مفتوح' });
    }

    if (status === 'IN_PROGRESS') {
      return this.site.localize({ fr: 'En cours', en: 'In progress', ar: 'قيد المعالجة' });
    }

    if (status === 'RESOLVED') {
      return this.site.localize({ fr: 'Résolu', en: 'Resolved', ar: 'تم الحل' });
    }

    return this.site.localize({ fr: 'Fermé', en: 'Closed', ar: 'مغلق' });
  }

  categoryLabel(category: SupportTicketCategory) {
    if (category === 'LOGIN') {
      return this.site.localize({ fr: 'Connexion', en: 'Login', ar: 'تسجيل الدخول' });
    }

    if (category === 'ACCOUNT') {
      return this.site.localize({ fr: 'Compte', en: 'Account', ar: 'الحساب' });
    }

    if (category === 'ACCESS') {
      return this.site.localize({ fr: 'Accès', en: 'Access', ar: 'الوصول' });
    }

    if (category === 'ROLE') {
      return this.site.localize({ fr: 'Rôle', en: 'Role', ar: 'الدور' });
    }

    if (category === 'MODULE_VISIBILITY') {
      return this.site.localize({
        fr: 'Visibilité module',
        en: 'Module visibility',
        ar: 'ظهور الوحدات',
      });
    }

    if (category === 'PERMISSION') {
      return this.site.localize({ fr: 'Permission', en: 'Permission', ar: 'الصلاحية' });
    }

    if (category === 'UI_BUG') {
      return this.site.localize({ fr: 'Bug interface', en: 'UI bug', ar: 'خلل واجهة' });
    }

    if (category === 'TRANSLATION') {
      return this.site.localize({ fr: 'Traduction', en: 'Translation', ar: 'الترجمة' });
    }

    if (category === 'MESSAGING') {
      return this.site.localize({ fr: 'Messagerie', en: 'Messaging', ar: 'المراسلة' });
    }

    if (category === 'NOTIFICATIONS') {
      return this.site.localize({ fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' });
    }

    if (category === 'ARTICLES') {
      return this.site.localize({ fr: 'Articles', en: 'Articles', ar: 'المقالات' });
    }

    if (category === 'SYSTEM') {
      return this.site.localize({ fr: 'Système', en: 'System', ar: 'النظام' });
    }

    return this.site.localize({ fr: 'Autre', en: 'Other', ar: 'أخرى' });
  }

  priorityLabel(priority: SupportTicketPriority) {
    if (priority === 'LOW') {
      return this.site.localize({ fr: 'Faible', en: 'Low', ar: 'منخفضة' });
    }

    if (priority === 'MEDIUM') {
      return this.site.localize({ fr: 'Moyenne', en: 'Medium', ar: 'متوسطة' });
    }

    if (priority === 'HIGH') {
      return this.site.localize({ fr: 'Haute', en: 'High', ar: 'مرتفعة' });
    }

    return this.site.localize({ fr: 'Urgente', en: 'Urgent', ar: 'عاجلة' });
  }

  statusBadgeClass(status: SupportTicketStatus) {
    if (status === 'OPEN') {
      return 'inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700';
    }

    if (status === 'IN_PROGRESS') {
      return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700';
    }

    if (status === 'RESOLVED') {
      return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
    }

    return 'inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700';
  }

  priorityBadgeClass(priority: SupportTicketPriority) {
    if (priority === 'LOW') {
      return 'inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700';
    }

    if (priority === 'MEDIUM') {
      return 'inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700';
    }

    if (priority === 'HIGH') {
      return 'inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700';
    }

    return 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700';
  }
}
