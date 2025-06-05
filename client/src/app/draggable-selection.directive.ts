import { Directive, ElementRef, HostListener, Renderer2, inject, output } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appDraggableSelection]'
})
export class DraggableSelectionDirective {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  private startX = 0;
  private startY = 0;
  private rect: HTMLElement | null = null;

  readonly selectionBox = output<{
    x: number;
    y: number;
    width: number;
    height: number;
}>();

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const parentRect = this.el.nativeElement.getBoundingClientRect();
    this.startX = event.pageX - parentRect.left - window.scrollX;
    this.startY = event.pageY - parentRect.top - window.scrollY;
    this.createRectangle();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const parentRect = this.el.nativeElement.getBoundingClientRect();
    if (this.rect) {
      const currentX = event.pageX - parentRect.left - window.scrollX;
      const currentY = event.pageY - parentRect.top - window.scrollY;
      const width = currentX - this.startX;
      const height = currentY - this.startY;

      this.renderer.setStyle(this.rect, 'width', `${Math.abs(width)}px`);
      this.renderer.setStyle(this.rect, 'height', `${Math.abs(height)}px`);
      this.renderer.setStyle(this.rect, 'left', `${Math.min(event.pageX, this.startX)}px`);
      this.renderer.setStyle(this.rect, 'top', `${Math.min(event.pageY, this.startY)}px`);
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.rect) {
      const parentRect = this.el.nativeElement.getBoundingClientRect();
      const endX = event.pageX - parentRect.left - window.scrollX;
      const endY = event.pageY - parentRect.top - window.scrollY;
      const width = Math.abs(endX - this.startX) / parentRect.width;
      const height = Math.abs(endY - this.startY) / parentRect.width;
      const x = Math.min(this.startX, endX) / parentRect.width;
      const y = Math.min(this.startY, endY) / parentRect.width;

      if (width > 0.01 && height > 0.01) {
        this.selectionBox.emit({ x, y, width, height });
      }

      this.removeRectangle();
    }
  }

  private createRectangle() {
    this.rect = this.renderer.createElement('div');
    this.renderer.setStyle(this.rect, 'position', 'absolute');
    this.renderer.setStyle(this.rect, 'border', '2px dashed hsl(220, 89%, 53%)');
    this.renderer.setStyle(this.rect, 'background', 'hsla(220, 89%, 53%, 0.2)');
    this.renderer.appendChild(this.el.nativeElement, this.rect);
  }

  private removeRectangle() {
    if (this.rect) {
      this.renderer.removeChild(this.el.nativeElement, this.rect);
      this.rect = null;
    }
  }
}
