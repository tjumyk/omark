import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {AnswerPage, BasicError, User} from "../models";
import {fabric} from "fabric";
import {MarkingService} from "../marking.service";
import {AnswerService, NewAnnotationForm} from "../answer.service";
import {AccountService} from "../account.service";


@Component({
  selector: 'app-annotation-layer',
  templateUrl: './annotation-layer.component.html',
  styleUrls: ['./annotation-layer.component.less']
})
export class AnnotationLayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input()
  page: AnswerPage;

  private _tool: string;

  @Input()
  get tool(): string{
    return this._tool;
  }
  set tool(_tool: string){
    this._tool = _tool;

    this.updateTool();
  }

  @Output()
  error = new EventEmitter<BasicError>();

  @ViewChild('canvas', {static: false})
  canvas: ElementRef<HTMLCanvasElement>;

  fabricCanvas: fabric.Canvas;
  penSize: number = 0.001; // relative to the page width

  user: User;

  windowResizeListener;

  constructor(private element: ElementRef<HTMLElement>,
              private accountService: AccountService,
              private answerService: AnswerService,
              private markingService: MarkingService) {
  }

  ngOnInit() {

  }

  ngOnDestroy(): void {
    if (this.windowResizeListener) {
      window.removeEventListener('resize', this.windowResizeListener);
      this.windowResizeListener = null;
    }

    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
      this.fabricCanvas = null;
    }
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.loadData();
  }

  private setupCanvas(){
    const element = this.element.nativeElement;
    const canvas = this.canvas.nativeElement;

    const width = element.clientWidth;
    const height = element.clientHeight;

    canvas.width = width;
    canvas.height = height;

    this.fabricCanvas = new fabric.Canvas(canvas);
    this.fabricCanvas.freeDrawingBrush.color = '#FF0000';
    this.fabricCanvas.freeDrawingBrush.width = this.penSize * width;
    this.fabricCanvas.selection = false;
    this.fabricCanvas.hoverCursor = 'pointer';

    this.windowResizeListener = () => {
      const oldWidth = this.fabricCanvas.getWidth();
      const oldHeight = this.fabricCanvas.getHeight();
      const newWidth = element.clientWidth;
      const newHeight = element.clientHeight;
      const widthRatio = newWidth/oldWidth;
      const heightRatio = newHeight / oldHeight;

      this.fabricCanvas.setWidth(newWidth);
      this.fabricCanvas.setHeight(newHeight);
      this.fabricCanvas.freeDrawingBrush.width = this.penSize * newWidth;

      for(let obj of this.fabricCanvas.getObjects()){
        obj.set({
          left: obj.left * widthRatio,
          top: obj.top * heightRatio,
          scaleX: obj.scaleX * widthRatio,
          scaleY: obj.scaleY * heightRatio
        })
      }
    };
    window.addEventListener('resize', this.windowResizeListener);

    this.fabricCanvas.on('path:created', (event)=>{
      const path = event['path'] as fabric.Path;
      this.lockObject(path);

      const data = path.toJSON();
      // convert to canvas-independent data
      const canvasWidth = this.fabricCanvas.getWidth();
      const canvasHeight = this.fabricCanvas.getHeight();
      data.left = data.left / canvasWidth;
      data.top = data.top / canvasHeight;
      data.scaleX = 1 / canvasWidth;
      data.scaleY = 1 / canvasHeight;

      const form = new NewAnnotationForm();
      form.data = JSON.stringify(data);
      this.answerService.addAnnotation(this.page.id, form).subscribe(
        ann=>{
          this.page.annotations.push(ann);
          path['_annotation_id'] = ann.id;
        },
        error=>this.error.emit(error.error)
      )
    });

    this.fabricCanvas.on('mouse:down', (event)=>{
      const target = event.target;
      if(target && this._tool == 'eraser'){
        const aid = target['_annotation_id'];
        if(aid){
          this.markingService.deleteAnnotation(aid).subscribe(
            ()=>{
              this.fabricCanvas.remove(target);

              let i = 0, annIndex=-1;
              for(let ann of this.page.annotations){
                if(ann.id == aid){
                  annIndex = i;
                  break
                }
                ++i;
              }
              if(annIndex >= 0){
                this.page.annotations.splice(annIndex, 1)
              }
            },
            error=>this.error.emit(error.error)
          )
        }
      }
    });
  }

  private loadData(){
    this.accountService.getCurrentUser().subscribe(
      user=>{
        this.user = user;

        for(let ann of this.page.annotations){
          const data = JSON.parse(ann.data);

          // convert from canvas-independent data to canvas-dependent data
          const canvasWidth = this.fabricCanvas.getWidth();
          const canvasHeight = this.fabricCanvas.getHeight();
          data.left = data.left * canvasWidth;
          data.top = data.top * canvasHeight;
          data.scaleX = data.scaleX * canvasWidth;
          data.scaleY = data.scaleY * canvasHeight;

          fabric.Path.fromObject(data, (path)=>{
            this.lockObject(path);
            path.selectable = ann.creator_id == user.id;
            path._annotation_id = ann.id;
            this.fabricCanvas.add(path)
          })
        }
      },
      error=>this.error.emit(error.error)
    )
  }

  private lockObject(obj: fabric.Object){
    obj.lockMovementX = true;
    obj.lockMovementY = true;
    obj.lockRotation = true;
    obj.lockScalingX = true;
    obj.lockScalingY = true;
    obj.hasControls = false;
  }

  private updateTool(){
    if(!this.fabricCanvas)
      return;

    switch (this._tool) {
      case 'hand':
        this.fabricCanvas.isDrawingMode = false;
        break;
      case 'pen':
        this.fabricCanvas.isDrawingMode = true;
        break;
      case 'eraser':
        this.fabricCanvas.isDrawingMode = false;
        break;
    }
  }

}
