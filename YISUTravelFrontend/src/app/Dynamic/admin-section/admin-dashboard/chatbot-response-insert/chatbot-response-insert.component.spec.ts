import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotResponseInsertComponent } from './chatbot-response-insert.component';

describe('ChatbotResponseInsertComponent', () => {
  let component: ChatbotResponseInsertComponent;
  let fixture: ComponentFixture<ChatbotResponseInsertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotResponseInsertComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatbotResponseInsertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
