import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageThirdviewComponent } from './homepage-thirdview.component';

describe('HomepageThirdviewComponent', () => {
  let component: HomepageThirdviewComponent;
  let fixture: ComponentFixture<HomepageThirdviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageThirdviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageThirdviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
