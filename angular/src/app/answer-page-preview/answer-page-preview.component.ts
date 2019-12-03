import {Component, Input, OnInit} from '@angular/core';
import {AnswerPage} from "../models";
import {PDFCache} from "../answer.service";

@Component({
  selector: 'app-answer-page-preview',
  templateUrl: './answer-page-preview.component.html',
  styleUrls: ['./answer-page-preview.component.less'],
  host: {'class': 'ui card fluid link'}
})
export class AnswerPagePreviewComponent implements OnInit {
  @Input()
  page: AnswerPage;
  @Input()
  pdfCache: PDFCache;

  constructor() {
  }

  ngOnInit() {
  }

}
