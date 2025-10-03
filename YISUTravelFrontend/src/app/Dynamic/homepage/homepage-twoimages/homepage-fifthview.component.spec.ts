import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageFifthviewComponent } from './homepage-fifthview.component';

describe('HomepageFifthviewComponent', () => {
  let component: HomepageFifthviewComponent;
  let fixture: ComponentFixture<HomepageFifthviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageFifthviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageFifthviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
