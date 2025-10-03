import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DienstleistungDashboardComponent } from './dienstleistung-dashboard.component';

describe('DienstleistungDashboardComponent', () => {
  let component: DienstleistungDashboardComponent;
  let fixture: ComponentFixture<DienstleistungDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienstleistungDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DienstleistungDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
