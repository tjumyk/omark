import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {AnswerPage} from "../models";
import {PDFCache} from "../answer.service";

@Component({
  selector: 'app-answer-page-view',
  templateUrl: './answer-page-view.component.html',
  styleUrls: ['./answer-page-view.component.less']
})
export class AnswerPageViewComponent implements OnInit {
  @Input()
  page: AnswerPage;
  @Input()
  pdfCache: PDFCache;
  @Input()
  pdfRenderText: boolean;

  isPdf: boolean;

  constructor(private element: ElementRef<HTMLElement>) {
  }

  ngOnInit() {
    if (!this.page || !this.pdfCache)
      return;

    this.isPdf = this.page.file_path.toLocaleLowerCase().endsWith('.pdf');

    const element = this.element.nativeElement;
    if(this.isPdf){
      element.classList.add('pdf');
    }else{
      element.classList.add('image');
    }
  }
}
