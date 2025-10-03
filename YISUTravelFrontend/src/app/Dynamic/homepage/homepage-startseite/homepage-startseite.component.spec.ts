import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageStartseiteComponent } from './homepage-startseite.component';

describe('HomepageStartseiteComponent', () => {
  let component: HomepageStartseiteComponent;
  let fixture: ComponentFixture<HomepageStartseiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageStartseiteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageStartseiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
