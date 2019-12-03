import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {AnswerBook, BasicError, Exam} from "../models";
import {PDFCache} from "../answer.service";

@Component({
  selector: 'app-answer-book-annotator',
  templateUrl: './answer-book-annotator.component.html',
  styleUrls: ['./answer-book-annotator.component.less']
})
export class AnswerBookAnnotatorComponent implements OnInit, AfterViewInit {
  error: BasicError;

  @Input()
  exam: Exam;
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

  constructor() { }

  ngOnInit() {

  }

  ngAfterViewInit(): void {
    setTimeout(()=>{
      if(this.startPageIndex){
        const pages = this.pageWrappers.nativeElement;
        const targetPage = pages.children.item(this.startPageIndex - 1) as HTMLElement;
        pages.scrollTo(0, targetPage.offsetTop);
      }
    }, 500);
  }

}
