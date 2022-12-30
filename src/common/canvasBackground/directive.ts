import { Directive, ElementRef, inject } from '@angular/core';
import { CONTEXT_PARAMS } from './model';

@Directive({
  standalone: true
})
export abstract class CanvasBackgroundDirective {

  private _elementRef: ElementRef<HTMLElement> = inject(ElementRef<HTMLElement>);
  private _canvas!: HTMLCanvasElement;
  private _webGL2RenderingContext!: WebGL2RenderingContext;

  protected get _renderingContext(): WebGL2RenderingContext {
    return this._webGL2RenderingContext;
  }

  constructor() {
    this._appendCanvas();
    this._initializeContext();
  }

  private _appendCanvas(): void {
    this._canvas = document.createElement('canvas');

    this._canvas.style.setProperty('position', 'absolute');
    this._canvas.style.setProperty('width', '100vw');
    this._canvas.style.setProperty('height', '100vh');

    this._elementRef.nativeElement.appendChild(this._canvas);

    // observeResize$(this._canvas).pipe(
    //   tap() //idk
    // )
  }

  /**
   * assuming webgl2 because I am lazy
   */
  private _initializeContext() {
    this._webGL2RenderingContext = this._canvas.getContext('webgl2', CONTEXT_PARAMS) as WebGL2RenderingContext;
    this._webGL2RenderingContext.getExtension('EXT_color_buffer_float');
    this._webGL2RenderingContext.clearColor(0, 0, 0, 1);
  }
}
