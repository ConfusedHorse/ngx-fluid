import { Directive, ElementRef, inject } from '@angular/core';
import { CONTEXT_PARAMS } from './model';

@Directive({
  standalone: true
})
export abstract class CanvasBackgroundDirective {

  protected _canvas!: HTMLCanvasElement;
  protected _webGL2RenderingContext!: WebGL2RenderingContext;
  protected _elementRef: ElementRef<HTMLElement> = inject(ElementRef<HTMLElement>);

  protected get _renderingContext(): WebGL2RenderingContext {
    return this._webGL2RenderingContext;
  }

  constructor() {
    this.#appendCanvas();
    this.#initializeContext();
  }

  #appendCanvas(): void {
    this._canvas = document.createElement('canvas');

    this._canvas.style.setProperty('position', 'absolute');
    this._canvas.style.setProperty('width', '100%');
    this._canvas.style.setProperty('height', '100%');
    this._canvas.style.setProperty('z-index', '-1');

    this._elementRef.nativeElement.appendChild(this._canvas);
  }

  /**
   * assuming webgl2 because I am lazy
   */
  #initializeContext() {
    this._webGL2RenderingContext = this._canvas.getContext('webgl2', CONTEXT_PARAMS) as WebGL2RenderingContext;
    this._webGL2RenderingContext.getExtension('EXT_color_buffer_float');
    this._webGL2RenderingContext.clearColor(0, 0, 0, 1);
  }
}
