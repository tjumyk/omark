import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {PDFPageProxy, PDFRenderTask} from "pdfjs-dist/webpack";
import * as pdfjsLib from "pdfjs-dist/webpack";

@Component({
  selector: 'app-pdf-page-view',
  templateUrl: './pdf-page-view.component.html',
  styleUrls: ['./pdf-page-view.component.less']
})
export class PdfPageViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input()
  page: PDFPageProxy;
  @Input()
  renderText: boolean;

  @ViewChild('wrapper', {static: false})
  wrapper: ElementRef<HTMLElement>;

  @ViewChild('canvas', {static: false})
  canvas: ElementRef<HTMLCanvasElement>;

  @ViewChild('textLayer', {static: false})
  textLayer: ElementRef<HTMLElement>;

  renderTask: PDFRenderTask;
  windowResizeListener: any;
  renderTextHandler: number;

  constructor(private element: ElementRef<HTMLElement>) {
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.render();
    this.windowResizeListener = () => {
      this.render()
    };
    window.addEventListener('resize', this.windowResizeListener)
  }

  ngOnDestroy(): void {
    if (this.windowResizeListener) {
      window.removeEventListener('resize', this.windowResizeListener)
    }
    if(this.renderTextHandler){
      clearTimeout(this.renderTextHandler)
    }
  }

  private render() {
    if (!this.page)
      return;

    if (this.renderTask) {
      this.renderTask.cancel();
      this.renderTask = null;
    }

    const element = this.element.nativeElement;
    const canvas = this.canvas.nativeElement;
    const wrapper = this.wrapper.nativeElement;
    const context = canvas.getContext('2d');

    const zoom = window.devicePixelRatio || 1.0;
    let viewport = this.page.getViewport({scale: 1.0});
    let width = element.clientWidth;
    viewport = this.page.getViewport({scale: zoom * width / viewport.width});
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    wrapper.style.width = width + 'px';
    wrapper.style.height = (width * viewport.height / viewport.width) + 'px';

    context.clearRect(0, 0, canvas.width, canvas.height);
    if(this.renderText){
      const textLayer = this.textLayer.nativeElement;
      textLayer.innerHTML = '';
    }

    this.renderTask = this.page.render({
      canvasContext: context,
      viewport: viewport
    });
    this.renderTask.promise.then(
      () => {
        this.renderTask = null;

        if(this.renderText){
          const textLayer = this.textLayer.nativeElement;
          clearTimeout(this.renderTextHandler);
          this.renderTextHandler = setTimeout(()=>{
            this.page.getTextContent().then(
              textContent=>{
                textLayer.innerHTML = '';
                const api = pdfjsLib['renderTextLayer'];
                const _textLayer = api({
                  textContent: textContent,
                  container: textLayer,
                  viewport: viewport
                });
                _textLayer._render();
              }
            )
          }, 1000);
        }
      },
      () => this.renderTask = null
    )
  }

}
