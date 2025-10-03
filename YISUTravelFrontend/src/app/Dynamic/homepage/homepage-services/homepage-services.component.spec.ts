import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageServicesComponent } from './homepage-services.component';

describe('HomepageServicesComponent', () => {
  let component: HomepageServicesComponent;
  let fixture: ComponentFixture<HomepageServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
