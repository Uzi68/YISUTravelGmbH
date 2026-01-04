import {Component, ElementRef, ViewChild} from '@angular/core';
import {MatFormField, MatHint, MatLabel} from "@angular/material/form-field";
import {FormsModule} from "@angular/forms";
import {MatInput} from "@angular/material/input";
import {
  MatChip,
  MatChipGrid,
  MatChipInput,
  MatChipInputEvent,
  MatChipListbox,
  MatChipRow
} from "@angular/material/chips";
import {MatIcon} from "@angular/material/icon";
import {NgForOf, NgIf} from "@angular/common";
import {MatButton, MatIconButton} from "@angular/material/button";
import {ChatbotService} from "../../../../Services/chatbot-service/chatbot.service";
import {COMMA, ENTER, SEMICOLON} from "@angular/cdk/keycodes";
import {
  ChatbotInstruction,
  ChatbotInstructionCreate,
  ChatbotResponse,
  ChatbotResponseCreate
} from "../../../../Models/Chatbot";
import {animate, style, transition, trigger} from "@angular/animations";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {MatDivider} from "@angular/material/divider";

@Component({
  selector: 'app-chatbot-response-insert',
  standalone: true,
  imports: [
    MatFormField,
    MatLabel,
    FormsModule,
    MatInput,
    MatIcon,
    MatChipInput,
    MatHint,
    NgForOf,
    MatButton,
    MatChipGrid,
    MatChipRow,
    NgIf,
    MatIconButton,
    MatPaginator,
    MatDivider
  ],
  templateUrl: './chatbot-response-insert.component.html',
  styleUrl: './chatbot-response-insert.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-15px) scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px) scale(0.98)' }))
      ])
    ])
  ]
})
export class ChatbotResponseInsertComponent {

  @ViewChild('keywordInput') keywordInput!: ElementRef<HTMLInputElement>;

  // Array vom Model
  getResponses: ChatbotResponse[] = [];
  editingResponse: ChatbotResponse | null = null;
  displayedColumns: string[] = ['id', 'input', 'response', 'keywords', 'actions'];
  newResponse: ChatbotResponseCreate = {
    input: '',
    response: '',
    keywords: []
  };
  instructions: ChatbotInstruction[] = [];
  editingInstruction: ChatbotInstruction | null = null;
  newInstruction: ChatbotInstructionCreate = {
    topic: '',
    instruction: ''
  };

  separatorKeysCodes: number[] = [ENTER, COMMA, SEMICOLON];
  showSuccess: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;
  showInstructionSuccess: boolean = false;
  instructionErrorMessage: string = '';
  isInstructionLoading: boolean = false;


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  pageSize = 10;
  currentPage = 0;

  get paginatedResponses(): ChatbotResponse[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.getResponses.slice(start, end);
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;

    // Nach oben scrollen zur Response-Container
    const container = document.querySelector('.knowledge-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  constructor(private chatbotService: ChatbotService) {}

  addKeyword(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Unterstützung für mehrere Keywords auf einmal (durch Komma getrennt)
    if (value) {
      const keywordsToAdd = value.split(/[,;]+/).map(k => k.trim()).filter(k => k !== '');

      keywordsToAdd.forEach(keyword => {
        if (keyword && !this.newResponse.keywords.includes(keyword)) {
          this.newResponse.keywords.push(keyword);
        }
      });
    }

    // Input-Feld leeren
    if (event.chipInput) {
      event.chipInput.clear();
    }
  }

ngOnInit() {
  this.loadResponses();
  this.loadInstructions();
}

  startEdit(response: ChatbotResponse) {
    this.editingResponse = { ...response };
    // keywords immer Array
    this.editingResponse.keywords = [...(response.keywords || [])];

    setTimeout(() => {
      document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  trackById(index: number, item: ChatbotResponse): number {
    return item.id!;
  }

  trackByKeyword(index: number, keyword: string): string {
    return keyword;
  }

  trackByInstructionId(index: number, item: ChatbotInstruction): number {
    return item.id;
  }


  deleteResponse(id: number, event: Event) {
    event.stopPropagation(); // Wichtig: Event Propagation stoppen

    if (confirm('Möchten Sie dieses Datenset wirklich löschen?')) {
      this.chatbotService.deleteResponse(id).subscribe({
        next: () => {
          this.getResponses = this.getResponses.filter(r => r.id !== id);
        },
        error: (err) => {
          console.error('Fehler beim Löschen:', err);
        }
      });
    }
  }

removeKeyword(keyword: string): void {
  const index = this.newResponse.keywords.indexOf(keyword);
  if (index >= 0) {
    this.newResponse.keywords.splice(index, 1);
  }
}

clearForm(): void {
  this.newResponse = { input: '', response: '', keywords: [] };
  this.showSuccess = false;
  this.errorMessage = '';
}

clearInstructionForm(): void {
  this.newInstruction = { topic: '', instruction: '' };
  this.showInstructionSuccess = false;
  this.instructionErrorMessage = '';
}

  submit(): void {
    this.showSuccess = false;
    this.errorMessage = '';

    if (!this.newResponse.input || !this.newResponse.response) {
      this.errorMessage = 'Titel/Thema und Wissensinhalt sind erforderlich!';
      return;
    }

    this.isLoading = true;

    // Hier den korrekten Typ übergeben
    this.chatbotService.insertResponse(this.newResponse)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showSuccess = true;
          this.newResponse = { input: '', response: '', keywords: [] };

          // Refresh die Liste
          this.loadResponses();

          // Success message nach 4 Sekunden ausblenden
          setTimeout(() => {
            this.showSuccess = false;
          }, 4000);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Fehler:', err);
          // Fehlerbehandlung
        }
      });
  }


  clearError(): void {
    this.errorMessage = '';
  }

  clearInstructionError(): void {
    this.instructionErrorMessage = '';
  }

  loadResponses(): void {
    this.chatbotService.getResponse().subscribe({
      next: (response) => {
        this.getResponses = response;
        console.log(this.getResponses);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Responses:', err);
        this.getResponses = [];
      }
    });
  }

  loadInstructions(): void {
    this.chatbotService.getInstructions().subscribe({
      next: (response) => {
        this.instructions = response;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Instruktionen:', err);
        this.instructions = [];
      }
    });
  }

  // Neue Methoden für die Bearbeitung
  addEditKeyword(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value && this.editingResponse) {
      const keywordsToAdd = value.split(/[,;]+/).map(k => k.trim()).filter(k => k !== '');

      keywordsToAdd.forEach(keyword => {
        if (keyword && !this.editingResponse!.keywords.includes(keyword)) {
          this.editingResponse!.keywords = [...this.editingResponse!.keywords, keyword];
        }
      });
    }

    if (event.chipInput) {
      event.chipInput.clear();
    }
  }


  removeEditKeyword(keyword: string): void {
    if (this.editingResponse) {
      const index = this.editingResponse.keywords.indexOf(keyword);
      if (index >= 0) {
        this.editingResponse.keywords.splice(index, 1);
      }
    }
  }

  saveEdit(): void {
    if (!this.editingResponse) return;

    this.isLoading = true;

    this.chatbotService.updateResponse(this.editingResponse.id!, this.editingResponse)
      .subscribe({
        next: (updatedResponse) => {
          const index = this.getResponses.findIndex(r => r.id === this.editingResponse!.id);
          if (index !== -1) {
            this.getResponses[index] = { ...updatedResponse };
          }
          this.editingResponse = null;
          this.showSuccess = true;
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Fehler beim Speichern der Änderungen';
        }
      });

  }


  cancelEdit(): void {
    this.editingResponse = null;
  }

  startInstructionEdit(instruction: ChatbotInstruction) {
    this.editingInstruction = { ...instruction };
  }

  submitInstruction(): void {
    this.showInstructionSuccess = false;
    this.instructionErrorMessage = '';

    if (!this.newInstruction.topic || !this.newInstruction.instruction) {
      this.instructionErrorMessage = 'Thema und Instruktion sind erforderlich!';
      return;
    }

    this.isInstructionLoading = true;

    this.chatbotService.insertInstruction(this.newInstruction)
      .subscribe({
        next: () => {
          this.isInstructionLoading = false;
          this.showInstructionSuccess = true;
          this.newInstruction = { topic: '', instruction: '' };

          this.loadInstructions();

          setTimeout(() => {
            this.showInstructionSuccess = false;
          }, 4000);
        },
        error: (err) => {
          this.isInstructionLoading = false;
          console.error('Fehler:', err);
        }
      });
  }

  saveInstructionEdit(): void {
    if (!this.editingInstruction) return;

    this.isInstructionLoading = true;

    this.chatbotService.updateInstruction(this.editingInstruction.id, this.editingInstruction)
      .subscribe({
        next: (updatedInstruction) => {
          const index = this.instructions.findIndex(i => i.id === this.editingInstruction!.id);
          if (index !== -1) {
            this.instructions[index] = { ...updatedInstruction };
          }
          this.editingInstruction = null;
          this.showInstructionSuccess = true;
          this.isInstructionLoading = false;
        },
        error: (err) => {
          this.isInstructionLoading = false;
          this.instructionErrorMessage = 'Fehler beim Speichern der Instruktion';
        }
      });
  }

  cancelInstructionEdit(): void {
    this.editingInstruction = null;
  }

  deleteInstruction(id: number, event: Event) {
    event.stopPropagation();

    if (confirm('Moechten Sie diese Instruktion wirklich loeschen?')) {
      this.chatbotService.deleteInstruction(id).subscribe({
        next: () => {
          this.instructions = this.instructions.filter(i => i.id !== id);
        },
        error: (err) => {
          console.error('Fehler beim Loeschen:', err);
        }
      });
    }
  }

}
