import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactCoverComponent } from './contact-cover.component';

describe('ContactCoverComponent', () => {
  let component: ContactCoverComponent;
  let fixture: ComponentFixture<ContactCoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactCoverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactCoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
