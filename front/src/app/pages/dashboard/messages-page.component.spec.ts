import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
} from '@angular/router';
import type {
  ConversationDetail,
  ConversationSummary,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { MessagesService } from '../../shared/services/messages.service';
import { MessagesPageComponent } from './messages-page.component';

class MockMessagesService {
  readonly unreadCount = signal(2);

  readonly conversations: ConversationSummary[] = [
    {
      id: 10,
      sujet: null,
      estGroupe: false,
      creePar: 'user-1',
      creeLe: '2026-03-20T10:00:00.000Z',
      modifieLe: '2026-03-20T10:00:00.000Z',
      participants: [
        {
          id: 'current-user',
          nom: 'Current',
          prenom: 'User',
          nomComplet: 'Current User',
          emailInstitutionnel: 'current@example.com',
          role: 'ADMINISTRATEUR',
          statut: 'ACTIF',
          actif: true,
        },
        {
          id: 'user-1',
          nom: 'Smith',
          prenom: 'John',
          nomComplet: 'John Smith',
          emailInstitutionnel: 'john@example.com',
          role: 'MEMBRE',
          statut: 'ACTIF',
          actif: true,
        },
      ],
      unreadCount: 2,
      dernierMessage: {
        id: 100,
        contenu: 'Bonjour',
        creeLe: '2026-03-20T10:00:00.000Z',
        expediteur: {
          id: 'user-1',
          nom: 'Smith',
          prenom: 'John',
          nomComplet: 'John Smith',
          emailInstitutionnel: 'john@example.com',
          role: 'MEMBRE',
          statut: 'ACTIF',
          actif: true,
        },
        pieceJointe: null,
      },
    },
  ];

  readonly detail: ConversationDetail = {
    conversation: {
      id: 10,
      sujet: null,
      estGroupe: false,
      creePar: 'user-1',
      creeLe: '2026-03-20T10:00:00.000Z',
      modifieLe: '2026-03-20T10:00:00.000Z',
    },
    participants: [
      {
        utilisateur: {
          id: 'current-user',
          nom: 'Current',
          prenom: 'User',
          nomComplet: 'Current User',
          emailInstitutionnel: 'current@example.com',
          role: 'ADMINISTRATEUR',
          statut: 'ACTIF',
          actif: true,
        },
        rejointLe: '2026-03-20T10:00:00.000Z',
      },
      {
        utilisateur: {
          id: 'user-1',
          nom: 'Smith',
          prenom: 'John',
          nomComplet: 'John Smith',
          emailInstitutionnel: 'john@example.com',
          role: 'MEMBRE',
          statut: 'ACTIF',
          actif: true,
        },
        rejointLe: '2026-03-20T10:00:00.000Z',
      },
    ],
    messages: [
      {
        id: 100,
        conversationId: 10,
        contenu: 'Bonjour',
        creeLe: '2026-03-20T10:00:00.000Z',
        expediteur: {
          id: 'user-1',
          nom: 'Smith',
          prenom: 'John',
          nomComplet: 'John Smith',
          emailInstitutionnel: 'john@example.com',
          role: 'MEMBRE',
          statut: 'ACTIF',
          actif: true,
        },
        lu: false,
        luLe: null,
        pieceJointe: null,
      },
    ],
  };

  readonly listConversations = jasmine
    .createSpy('listConversations')
    .and.resolveTo(this.conversations);

  readonly getConversation = jasmine
    .createSpy('getConversation')
    .and.resolveTo(this.detail);

  readonly sendMessage = jasmine
    .createSpy('sendMessage')
    .and.resolveTo(this.detail.messages[0]);

  readonly searchRecipients = jasmine
    .createSpy('searchRecipients')
    .and.resolveTo([]);

  readonly createDirectConversation = jasmine
    .createSpy('createDirectConversation')
    .and.resolveTo(this.detail);

  readonly createGroupConversation = jasmine
    .createSpy('createGroupConversation')
    .and.resolveTo(this.detail);

  readonly archiveConversation = jasmine
    .createSpy('archiveConversation')
    .and.resolveTo({ conversationId: 10, archived: true });

  readonly leaveGroupConversation = jasmine
    .createSpy('leaveGroupConversation')
    .and.resolveTo({ conversationId: 10, left: true });

  readonly downloadMessageAttachment = jasmine
    .createSpy('downloadMessageAttachment')
    .and.resolveTo(undefined);
}

class MockAuthService {
  readonly session = signal<any>({
    accessToken: 'token-1',
    utilisateur: { id: 'current-user', role: 'ADMINISTRATEUR' },
  });
}

class MockSitePreferencesService {
  localize(value: string | Record<string, string>) {
    if (typeof value === 'string') {
      return value;
    }

    return value['fr'] || value['en'] || Object.values(value)[0] || '';
  }
}

describe('MessagesPageComponent', () => {
  let fixture: ComponentFixture<MessagesPageComponent>;
  let component: MessagesPageComponent;
  let messagesService: MockMessagesService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigate']),
        },
        {
          provide: MessagesService,
          useClass: MockMessagesService,
        },
        {
          provide: AuthService,
          useClass: MockAuthService,
        },
        {
          provide: SitePreferencesService,
          useClass: MockSitePreferencesService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesPageComponent);
    component = fixture.componentInstance;
    messagesService = TestBed.inject(MessagesService) as unknown as MockMessagesService;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders messaging header and unread badge', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';

    expect(text).toContain('Messagerie');
    expect(text).toContain('message(s) non lu(s)');
  });

  it('loads and opens the first conversation on init', () => {
    expect(messagesService.listConversations).toHaveBeenCalled();
    expect(messagesService.getConversation).toHaveBeenCalledWith(10);
    expect(component.selectedConversationId()).toBe(10);
  });

  it('sends a message from the composer using conversationId', async () => {
    component.messageDraft.set('  Bonjour test  ');

    await component.sendMessage();

    expect(messagesService.sendMessage).toHaveBeenCalledWith({
      conversationId: 10,
      content: 'Bonjour test',
      attachment: null,
    });
  });
});
