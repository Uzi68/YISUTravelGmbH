import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DienstleistungServicesComponent } from './dienstleistung-services.component';

describe('DienstleistungServicesComponent', () => {
  let component: DienstleistungServicesComponent;
  let fixture: ComponentFixture<DienstleistungServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienstleistungServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DienstleistungServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
