import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactFirstviewComponent } from './contact-firstview.component';

describe('ContactFirstviewComponent', () => {
  let component: ContactFirstviewComponent;
  let fixture: ComponentFixture<ContactFirstviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactFirstviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactFirstviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
