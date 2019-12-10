import {Component, OnInit} from '@angular/core';
import {AnswerBook, AnswerPage, BasicError, Task, User} from "../models";
import {AnswerService, PDFCache, PDFCacheEntry, UpdateAnswerBookForm} from "../answer.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {HttpEventType} from "@angular/common/http";
import * as pdfjsLib from "pdfjs-dist/webpack";
import {TaskService} from "../task.service";
import {AccountService} from "../account.service";
import {CaptureSettings} from "../answer-book-capture/answer-book-capture.component";

@Component({
  selector: 'app-answer-book',
  templateUrl: './answer-book.component.html',
  styleUrls: ['./answer-book.component.less']
})
export class AnswerBookComponent implements OnInit {
  error: BasicError;

  user: User;
  isAdmin: boolean;

  taskId: number;
  task: Task;

  bookId: number;
  book: AnswerBook;
  loadingBook: boolean;

  addingPages: boolean;
  addPagesProgress: number;

  pdfCache: PDFCache;

  annotatorShown: boolean;
  annotatorStartPageIndex: number;

  captureShown: boolean;
  captureSettings = new CaptureSettings();

  constructor(private accountService: AccountService,
              private taskService: TaskService,
              private answerService: AnswerService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.taskId = parseInt(this.route.parent.snapshot.paramMap.get('task_id'));

    this.accountService.getCurrentUser().subscribe(
      user => {
        this.user = user;
        this.isAdmin = AccountService.isAdmin(user);

        this.taskService.getCachedTask(this.taskId).subscribe(
          task => {
            this.task = task;

            this.route.paramMap.subscribe(
              val=>{
                this.book = undefined;
                this.pdfCache = {};
                this.annotatorStartPageIndex = undefined;
                this.bookId = parseInt(val.get('book_id'));

                this.loadingBook = true;
                this.answerService.getBook(this.bookId).pipe(
                  finalize(() => this.loadingBook = false)
                ).subscribe(
                  book => {
                    if (book.task_id != this.taskId) {
                      this.error = {msg: 'book does not belong to this task'};
                      return;
                    }

                    this.book = book;

                    this.processPages(book.pages);
                  },
                  error => this.error = error.error
                )
              }
            );
          },
          error => this.error = error.error
        )
      },
      error=>this.error = error.error
    )
  }

  private processPages(pages: AnswerPage[]) {
    for(let page of pages){
      if (page.file_path.toLowerCase().endsWith('.pdf')) {
        if (this.pdfCache[page.file_path] === undefined) {
          this.pdfCache[page.file_path] = null;  // mark null to indicate requested
          this.answerService.getPageFile(page).subscribe(
            data => {
              pdfjsLib.getDocument(data).promise.then(
                doc => {
                  const entry = new PDFCacheEntry();
                  this.pdfCache[page.file_path] = entry;
                  entry.document = doc;

                  const processPage = (i)=>{
                    doc.getPage(i).then(
                      _page => {
                        entry.pages[i - 1] = _page;
                        for(let __page of pages){
                          if(__page.file_path == page.file_path && i == __page.file_index){
                            __page['_loaded']  = true;
                            break;
                          }
                        }
                      },
                      error => this.error = {msg: 'Failed to get PDF page', detail: error}
                    );
                  };

                  const numPages = doc.numPages;
                  let i = 1;
                  while(i <= numPages){
                    processPage(i);
                    ++i;
                  }
                },
                error => {
                  this.error = {msg: 'Failed to load PDF Document', detail: error}
                }
              )
            },
            error => this.error = error.error
          )
        }
      } else {
        this.answerService.getPageFile(page).subscribe(
          data => {
            page['_loaded'] = true;
          },
          error => this.error = error.error
        )
      }
    }
  }

  addPages(fileList: FileList) {
    if (!fileList.length)
      return;

    const files = [];
    let i = 0;
    while (i < fileList.length) {
      const file = fileList.item(i);
      files.push(file);
      ++i;
    }

    this.addingPages = true;
    this.answerService.addPages(this.bookId, files).pipe(
      finalize(() => this.addingPages = false)
    ).subscribe(
      event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            this.addPagesProgress = Math.round(100 * event.loaded / event.total);
            break;
          case HttpEventType.Response:
            const pages = event.body as AnswerPage[];
            this.processPages(pages);
            this.book.pages.push(...pages)
        }
      },
      error => this.error = error.error
    )
  }

  showAnnotator(startPageIndex: number) {
    window.document.body.style.overflowY = 'hidden';
    this.annotatorStartPageIndex = startPageIndex;
    this.annotatorShown = true;
  }

  hideAnnotator() {
    window.document.body.style.overflowY = null;
    this.annotatorShown = false;
  }

  showCapture() {
    window.document.body.style.overflowY = 'hidden';
    this.captureShown = true;
  }

  hideCapture() {
    window.document.body.style.overflowY = null;
    this.captureShown = false;
  }

  afterPageDeleted(page: AnswerPage) {
    let i = 0, target = -1;
    for (let _page of this.book.pages) {
      if (_page.id == page.id) {
        target = i;
        break;
      }
      ++i;
    }
    if (target >= 0) {
      this.book.pages.splice(target, 1)
    }
  }

  afterCaptureNewPages(pages: AnswerPage[]){
    this.processPages(pages);
    this.book.pages.push(...pages)
  }
}
