import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerPage, BasicError} from "../models";
import {AnswerService, PDFCache, UpdateAnswerPageForm} from "../answer.service";
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
  updated = new EventEmitter<void>();
  @Output()
  deleted = new EventEmitter<void>();
  @Output()
  error = new EventEmitter<BasicError>();

  editing: boolean;
  editIndex: number;
  updating: boolean;

  constructor(private adminService: AdminService,
              private answerService: AnswerService) {
  }

  ngOnInit() {
  }

  deletePage(page: AnswerPage, btn: HTMLElement) {
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

  startEditingPage(){
    this.editIndex = this.page.index;
    this.editing = true;
  }

  updatePage(index: any) {
    if(typeof index == 'string')
      index = parseInt(index);

    const form = new UpdateAnswerPageForm();
    form.index = index;

    this.updating = true;
    this.answerService.updatePage(this.page.id, form).pipe(
      finalize(() => this.updating = false)
    ).subscribe(
      page => {
        // assume other fields do not change
        this.page.index = page.index;
        this.page.transform = page.transform;
        this.page.modified_at = page.modified_at;
        this.page.modifier_id = page.modifier_id;
        this.page.modifier = page.modifier;

        this.editing = false;
        this.updated.emit();
      },
      error => this.error.emit(error.error)
    )
  }
}
