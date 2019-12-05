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
import {AnswerBook, BasicError, Task} from "../models";
import {PDFCache} from "../answer.service";

@Component({
  selector: 'app-answer-book-annotator',
  templateUrl: './answer-book-annotator.component.html',
  styleUrls: ['./answer-book-annotator.component.less']
})
export class AnswerBookAnnotatorComponent implements OnInit, AfterViewInit, OnDestroy {
  error: BasicError;

  @Input()
  task: Task;
  @Input()
  book: AnswerBook;
  @Input()
  pdfCache: PDFCache;
  @Input()
  startPageIndex: number;

  @Output()
  closed = new EventEmitter<any>();

  @ViewChild('pageWrappers', {static: false})
  pageWrappers: ElementRef<HTMLElement>;

  autoScrollHandler: number;

  tool: string = 'hand';

  constructor() { }

  ngOnInit() {

  }

  ngOnDestroy(): void {
    if(this.autoScrollHandler)
      clearTimeout(this.autoScrollHandler);
  }

  ngAfterViewInit(): void {
    if(this.startPageIndex){
      this.autoScrollHandler = setTimeout(()=>{
        const pages = this.pageWrappers.nativeElement;
        const targetPage = pages.children.item(this.startPageIndex - 1) as HTMLElement;
        pages.scrollTo(0, targetPage.offsetTop);
      }, 500);
    }
  }

}
