import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageFlugpartnerComponent } from './homepage-flugpartner.component';

describe('HomepageFlugpartnerComponent', () => {
  let component: HomepageFlugpartnerComponent;
  let fixture: ComponentFixture<HomepageFlugpartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageFlugpartnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageFlugpartnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
