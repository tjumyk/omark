import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerBook, BasicError, Task} from "../models";
import {PDFCache} from "../answer.service";

@Component({
  selector: 'app-answer-book-print',
  templateUrl: './answer-book-print.component.html',
  styleUrls: ['./answer-book-print.component.less']
})
export class AnswerBookPrintComponent implements OnInit {
  error: BasicError;

  @Input()
  task: Task;
  @Input()
  book: AnswerBook;
  @Input()
  pdfCache: PDFCache;

  @Output()
  closed = new EventEmitter<any>();

  constructor() {
  }

  ngOnInit() {

  }

  print() {
    window.print();
  }
}
