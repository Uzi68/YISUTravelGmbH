import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageSixthviewComponent } from './homepage-sixthview.component';

describe('HomepageSixthviewComponent', () => {
  let component: HomepageSixthviewComponent;
  let fixture: ComponentFixture<HomepageSixthviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageSixthviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageSixthviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
