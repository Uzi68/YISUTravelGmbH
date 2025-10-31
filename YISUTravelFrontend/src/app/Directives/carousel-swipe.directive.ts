import {Directive, ElementRef, Inject, Input, PLATFORM_ID, AfterViewInit, Renderer2, OnDestroy} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Directive({
  selector: '[appCarouselSwipe]',
  standalone: true
})
export class CarouselSwipeDirective implements AfterViewInit, OnDestroy {
  @Input() swipeThreshold = 50; // pixels

  private isDown = false;
  private startX = 0;
  private lastX = 0;
  private unsubscribeFn: (() => void)[] = [];

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const host = this.el.nativeElement;
    
    // Set CSS on host
    this.renderer.setStyle(host, 'userSelect', 'none');
    this.renderer.setStyle(host, 'touchAction', 'pan-y');
    
    // Set pointer-events: none on all images inside to allow events to pass through
    const images = host.querySelectorAll('img');
    images.forEach(img => {
      this.renderer.setStyle(img, 'pointerEvents', 'none');
      this.renderer.setStyle(img, 'userSelect', 'none');
      this.renderer.setStyle(img, 'draggable', 'false');
    });
    
    // Use event delegation to catch pointer events from child elements
    const pointerDownHandler = (e: PointerEvent) => {
      e.stopPropagation();
      this.isDown = true;
      this.startX = e.clientX || 0;
      this.lastX = this.startX;

      // Try to capture pointer so we still receive events even when cursor leaves
      try { (e.target as Element)?.setPointerCapture?.(e.pointerId); } catch {}

      // Attach window-level listeners to ensure we get pointerup even outside the element
      const onMove = (ev: PointerEvent) => {
        this.lastX = ev.clientX || this.lastX;
        // Prevent text selection while dragging
        ev.preventDefault?.();
      };

      const onUp = (ev: PointerEvent) => {
        cleanupWindow();
        if (!this.isDown) return;
        const dx = (ev.clientX || this.lastX) - this.startX;
        this.isDown = false;

        if (Math.abs(dx) < this.swipeThreshold) return;
        const carousel = this.getCarouselInstance();
        if (!carousel) return;
        if (dx < 0) carousel.next(); else carousel.prev();
      };

      const onCancel = () => {
        cleanupWindow();
        this.isDown = false;
      };

      const cleanupWindow = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onCancel, true);
        window.removeEventListener('pointerout', onCancel, true);
        window.removeEventListener('pointerleave', onCancel, true);
      };

      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onCancel, true);
      window.addEventListener('pointerout', onCancel, true);
      window.addEventListener('pointerleave', onCancel, true);
    };
    
    const pointerUpHandler = (e: PointerEvent) => {
      if (!this.isDown) return;
      const dx = (e.clientX || this.lastX) - this.startX;
      this.isDown = false;

      if (Math.abs(dx) < this.swipeThreshold) return;
      const carousel = this.getCarouselInstance();
      if (!carousel) return;

      // Negative dx => swipe left => next; positive => prev
      if (dx < 0) carousel.next(); else carousel.prev();
    };
    
    const pointerLeaveHandler = () => {
      this.isDown = false;
    };
    
    // Add event listeners with capture to catch events before they're handled by children
    const options = { capture: true };
    host.addEventListener('pointerdown', pointerDownHandler, options);
    host.addEventListener('pointerup', pointerUpHandler, options);
    host.addEventListener('pointerleave', pointerLeaveHandler, options);
    
    // Store cleanup functions
    this.unsubscribeFn.push(
      () => host.removeEventListener('pointerdown', pointerDownHandler, options),
      () => host.removeEventListener('pointerup', pointerUpHandler, options),
      () => host.removeEventListener('pointerleave', pointerLeaveHandler, options)
    );
  }

  ngOnDestroy() {
    this.unsubscribeFn.forEach(fn => fn());
  }

  private getCarouselInstance(): any | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const w = window as any;
    const bootstrap = w?.bootstrap;
    if (!bootstrap?.Carousel) return null;
    try {
      return bootstrap.Carousel.getOrCreateInstance(this.el.nativeElement);
    } catch {
      return null;
    }
  }
}


