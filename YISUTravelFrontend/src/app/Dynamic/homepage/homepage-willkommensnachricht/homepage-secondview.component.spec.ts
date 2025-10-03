import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageSecondviewComponent } from './homepage-secondview.component';

describe('HomepageSecondviewComponent', () => {
  let component: HomepageSecondviewComponent;
  let fixture: ComponentFixture<HomepageSecondviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageSecondviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageSecondviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
