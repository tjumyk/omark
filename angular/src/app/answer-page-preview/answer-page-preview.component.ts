import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerPage, BasicError} from "../models";
import {PDFCache} from "../answer.service";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-answer-page-preview',
  templateUrl: './answer-page-preview.component.html',
  styleUrls: ['./answer-page-preview.component.less'],
  host: {'class': 'ui card fluid'}
})
export class AnswerPagePreviewComponent implements OnInit {
  @Input()
  page: AnswerPage;
  @Input()
  pdfCache: PDFCache;
  @Input()
  enableAdmin: boolean;

  @Output()
  zoomIn = new EventEmitter<void>();
  @Output()
  deleted = new EventEmitter<void>();
  @Output()
  error = new EventEmitter<BasicError>();

  constructor(private adminService: AdminService) {
  }

  ngOnInit() {
  }

  deletePage(page: AnswerPage, btn: HTMLButtonElement) {
    if (!confirm(`Really want to delete page ${page.index} (ID=${page.id})?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.deletePage(page.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      () => this.deleted.emit(),
      error => this.error.emit(error.error)
    )
  }
}
