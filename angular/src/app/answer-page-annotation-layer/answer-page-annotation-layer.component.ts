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
import {Annotation, AnswerPage, BasicError, User} from "../models";
import {fabric} from "fabric";
import {MarkingService} from "../marking.service";
import {AnswerService, NewAnnotationsForm} from "../answer.service";
import {AccountService} from "../account.service";

export class AnnotationItem {
  path: fabric.Path;
  data: string;
}

@Component({
  selector: 'app-answer-page-annotation-layer',
  templateUrl: './answer-page-annotation-layer.component.html',
  styleUrls: ['./answer-page-annotation-layer.component.less']
})
export class AnswerPageAnnotationLayerComponent implements OnInit, AfterViewInit, OnDestroy {
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

  checkSetupHandler: number;

  delayedUploadAnnotationsHandler: number;
  uploadAnnotationsDelay: number = 1000;
  annotationUploadQueue: AnnotationItem[] = [];

  constructor(private element: ElementRef<HTMLElement>,
              private accountService: AccountService,
              private answerService: AnswerService,
              private markingService: MarkingService) {
  }

  ngOnInit() {

  }

  ngOnDestroy(): void {
    if (this.checkSetupHandler) {
      clearInterval(this.checkSetupHandler);
    }

    if (this.windowResizeListener) {
      window.removeEventListener('resize', this.windowResizeListener);
      this.windowResizeListener = null;
    }

    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
      this.fabricCanvas = null;
    }

    if (this.delayedUploadAnnotationsHandler) {  // cancel delayed upload and upload now (if queue is not empty)
      clearTimeout(this.delayedUploadAnnotationsHandler);
      this.uploadAnnotations();
    }
  }

  ngAfterViewInit(): void {
    const setupChecker = () => {
      if (this.checkReadyToSetup()) {
        clearInterval(this.checkSetupHandler);
        this.setupCanvas();
        this.loadData();
      }
    };
    this.checkSetupHandler = setInterval(setupChecker, 500);
    setupChecker();
  }

  private checkReadyToSetup():boolean{
    const element = this.element.nativeElement;

    const width = element.clientWidth;
    const height = element.clientHeight;

    return width > 0 && height > 0;
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

      // create data item and push it into queue
      let dataItem = new AnnotationItem();
      dataItem.path = path;
      dataItem.data = JSON.stringify(data);
      this.annotationUploadQueue.push(dataItem);

      clearTimeout(this.delayedUploadAnnotationsHandler);
      this.delayedUploadAnnotationsHandler =
        setTimeout(() => this.uploadAnnotations(), this.uploadAnnotationsDelay);
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
              if (annIndex >= 0) {
                this.page.annotations.splice(annIndex, 1)
              }
            },
            error => this.error.emit(error.error)
          )
        } else {
          alert('Annotation has not yet been synced.\nPlease wait for a few seconds.')
        }
      }
    });
  }

  private uploadAnnotations() {
    if (!this.annotationUploadQueue || !this.annotationUploadQueue.length)
      return;

    let pathList: fabric.Path[] = [], dataList: string[] = [];
    for (let _path of this.annotationUploadQueue) {
      pathList.push(_path.path);
      dataList.push(_path.data)
    }
    this.annotationUploadQueue = [];  // clear queue after data copy

    const form = new NewAnnotationsForm();
    form.data = dataList;
    this.answerService.addAnnotations(this.page.id, form).subscribe(
      annotation_ids => {
        let i = 0;
        for (let ann_id of annotation_ids) {
          let ann = new Annotation();
          ann.id = ann_id
          ann.creator_id = this.user.id;
          ann.page_id = this.page.id;
          ann.data = dataList[i];  // fill in the data from the request
          // TODO other attributes of ann are not retrieved
          this.page.annotations.push(ann);
          pathList[i]['_annotation_id'] = ann.id;
          ++i;
        }
      },
      error => {
        if (this.fabricCanvas) {
          for (let path of pathList) {
            this.fabricCanvas.remove(path);
          }
        }
        this.error.emit(error.error);
      }
    )
  }

  private loadData() {
    this.accountService.getCurrentUser().subscribe(
      user => {
        this.user = user;

        for (let ann of this.page.annotations) {
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
