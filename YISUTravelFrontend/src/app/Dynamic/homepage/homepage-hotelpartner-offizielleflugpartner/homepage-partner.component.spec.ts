import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepagePartnerComponent } from './homepage-partner.component';

describe('HomepagePartnerComponent', () => {
  let component: HomepagePartnerComponent;
  let fixture: ComponentFixture<HomepagePartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepagePartnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepagePartnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
