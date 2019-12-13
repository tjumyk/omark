import {Component, OnDestroy, OnInit} from '@angular/core';
import {AnswerBook, AnswerPage, BasicError, Task, User} from "../models";
import {AnswerService, PDFCache, PDFCacheEntry} from "../answer.service";
import {ActivatedRoute} from "@angular/router";
import {concatMap, finalize, takeUntil} from "rxjs/operators";
import {HttpEventType} from "@angular/common/http";
import * as pdfjsLib from "pdfjs-dist/webpack";
import {TaskService} from "../task.service";
import {AccountService} from "../account.service";
import {CaptureSettings} from "../answer-book-capture/answer-book-capture.component";
import {from, Subject, zip} from "rxjs";
import {TitleService} from "../title.service";

export class AnswerPageGroup {
  filePath: string;
  pages: AnswerPage[] = [];
}

@Component({
  selector: 'app-answer-book',
  templateUrl: './answer-book.component.html',
  styleUrls: ['./answer-book.component.less']
})
export class AnswerBookComponent implements OnInit, OnDestroy {
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

  preloadNextCheckerHandler: number;
  preloadingNext: boolean;
  preloadNextProgress: number;

  abortLoadFiles = new Subject<void>();

  printMode: boolean;

  constructor(private accountService: AccountService,
              private taskService: TaskService,
              private answerService: AnswerService,
              private titleService: TitleService,
              private route: ActivatedRoute) {
  }

  ngOnDestroy(): void {
    clearInterval(this.preloadNextCheckerHandler);
    this.abortLoadFiles.next();
    window.document.body.style.overflowY = null;
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
              val => {
                this.book = undefined;
                this.pdfCache = {};
                this.annotatorShown = false;
                this.annotatorStartPageIndex = undefined;
                if (this.captureShown) {  // keep previous capture state, update body accordingly
                  window.document.body.style.overflowY = 'hidden';
                } else {
                  window.document.body.style.overflowY = null;
                }

                clearInterval(this.preloadNextCheckerHandler);
                this.abortLoadFiles.next();

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

                    let bookTitle = `Book ${book.id}`;
                    if(book.student){
                      bookTitle += ` (${book.student.name})`
                    }
                    this.titleService.setTitle(bookTitle, this.task.name);
                    this.book = book;

                    this.processPages(book.pages);
                    this.setupNextBookPreload();
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
    if (pages.length == 0)
      return;
    const bookId = pages[0].book_id;
    const pageGroups = this.groupPagesByFilePath(pages);
    const loadTasks = from(pageGroups).pipe(
      concatMap(group => this.answerService.getBookFile(bookId, group.filePath))
    );
    zip(pageGroups, loadTasks).pipe(
      takeUntil(this.abortLoadFiles)
    ).subscribe(
      ([group, data]) => {
        if (group.filePath.toLowerCase().endsWith('.pdf')) {
          pdfjsLib.getDocument(data).promise.then(
            doc => {
              if (bookId != this.bookId)
                return; // stop processing if bookId has been changed

              const entry = new PDFCacheEntry();
              this.pdfCache[group.filePath] = entry;
              entry.document = doc;

              const numPages = doc.numPages;
              let currentPageIndex = 1; // start from 1

              const processNextPage = () => {
                if (currentPageIndex > numPages || this.bookId != bookId) {
                  return // stop processing if all pages are processed or bookId has been changed
                }
                doc.getPage(currentPageIndex).then(
                  pdfPage => {
                    entry.pages[currentPageIndex - 1] = pdfPage;
                    for (let page of group.pages) {
                      if (currentPageIndex == page.file_index) {
                        page['_loaded'] = true;
                      }
                    }

                    ++currentPageIndex;
                    processNextPage()  // recursive call
                  },
                  error => this.error = {
                    msg: `Failed to load PDF page (page ${currentPageIndex})`,
                    detail: error
                  }
                );
              };
              processNextPage();
            },
            error => {
              this.error = {msg: 'Failed to load PDF Document', detail: error}
            }
          )
        } else {
          for (let page of group.pages) {
            page['_loaded'] = true;
          }
        }
      },
      error => this.error = error.error
    )
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
    this.addPagesProgress = 0;
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

  afterCaptureNewPages(pages: AnswerPage[]) {
    this.processPages(pages);
    this.book.pages.push(...pages)
  }

  private groupPagesByFilePath(pages: AnswerPage[]): AnswerPageGroup[] {
    const groupMap: { [filePath: string]: AnswerPageGroup } = {};
    for (let page of pages) {
      let group = groupMap[page.file_path];
      if (!group) {
        group = new AnswerPageGroup();
        group.filePath = page.file_path;
        groupMap[page.file_path] = group;
      }
      group.pages.push(page)
    }
    const groups: AnswerPageGroup[] = [];
    for (let key in groupMap) {
      groups.push(groupMap[key])
    }
    return groups;
  }

  private setupNextBookPreload() {
    this.preloadNextCheckerHandler = setInterval(() => {
      let currentAllLoaded = true;
      for (let page of this.book.pages) {
        if (!page['_loaded']) {
          currentAllLoaded = false;
          break;
        }
      }

      if (currentAllLoaded) {
        clearInterval(this.preloadNextCheckerHandler);
        this.answerService.goToBook(this.bookId, true, true).subscribe(
          _book => {
            if(!_book) // no next book
              return;

            this.preloadingNext = true;
            this.preloadNextProgress = 0;
            let countLoaded = 0;
            const groups = this.groupPagesByFilePath(_book.pages);
            from(groups).pipe(
              concatMap(group => this.answerService.getBookFile(_book.id, group.filePath)),
              takeUntil(this.abortLoadFiles),
              finalize(()=>this.preloadingNext = false)
            ).subscribe(
              data => {
                ++countLoaded;
                this.preloadNextProgress = Math.round(100 * countLoaded / groups.length);
              },
              error => this.error = error.error
            )
          },
          error => this.error = error.error
        )
      }
    }, 1000)
  }
}
