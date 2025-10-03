import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageIconsComponent } from './homepage-icons.component';

describe('HomepageIconsComponent', () => {
  let component: HomepageIconsComponent;
  let fixture: ComponentFixture<HomepageIconsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageIconsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageIconsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
