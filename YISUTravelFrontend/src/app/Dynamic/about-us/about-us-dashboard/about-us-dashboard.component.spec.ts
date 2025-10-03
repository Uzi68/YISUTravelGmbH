import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutUsDashboardComponent } from './about-us-dashboard.component';

describe('AboutUsDashboardComponent', () => {
  let component: AboutUsDashboardComponent;
  let fixture: ComponentFixture<AboutUsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutUsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutUsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
