import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageFourthviewComponent } from './homepage-fourthview.component';

describe('HomepageFourthviewComponent', () => {
  let component: HomepageFourthviewComponent;
  let fixture: ComponentFixture<HomepageFourthviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageFourthviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageFourthviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
