import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {TaskService} from "../task.service";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {ActivatedRoute} from "@angular/router";
import {AnswerBook, BasicError, Task, User} from "../models";
import {AnswerService} from "../answer.service";
import * as pdfjsLib from "pdfjs-dist/webpack";
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-pdf-test-bed',
  templateUrl: './pdf-test-bed.component.html',
  styleUrls: ['./pdf-test-bed.component.less']
})
export class PdfTestBedComponent implements OnInit, AfterViewInit, OnDestroy {
  error: BasicError;

  user: User;
  isAdmin: boolean;

  taskId: number;
  task: Task;

  loadingBooks: boolean;
  totalTests: number;
  testsDone: number;

  @ViewChild('canvas', {static: true})
  canvas: ElementRef<HTMLCanvasElement>;

  @ViewChild('wrapper', {static: true})
  wrapper: ElementRef<HTMLElement>;

  stopFlag: boolean;

  constructor(private taskService: TaskService,
              private titleService: TitleService,
              private route: ActivatedRoute,
              private accountService: AccountService,
              private answerService: AnswerService,
              private element: ElementRef<HTMLElement>) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.stopFlag = true;
  }

  ngAfterViewInit() {
    this.taskId = parseInt(this.route.parent.snapshot.paramMap.get('task_id'));

    this.accountService.getCurrentUser().subscribe(
      user => {
        this.user = user;
        this.isAdmin = AccountService.isAdmin(user);

        this.taskService.getCachedTask(this.taskId).subscribe(
          task => {
            this.task = task;
            this.titleService.setTitle(task.name);

            this.loadingBooks = true;
            this.taskService.getAnswerBooks(this.taskId).pipe(
              finalize(() => this.loadingBooks = false)
            ).subscribe(
              books => {
                this.testBooks(books);
              },
              error => this.error = error.error
            )
          },
          error => this.error = error.error
        )
      },
      error => this.error = error.error
    )
  }

  private testBooks(books: AnswerBook[]) {
    if (!books || !books.length)
      return;

    console.log('Test Started');
    this.totalTests = books.length;
    this.testsDone = 0;

    let currentBookIndex = 0;
    let currentBookFilePaths: string[] = undefined;
    let currentBookFilePathIndex = 0;

    const element = this.element.nativeElement;
    const canvas = this.canvas.nativeElement;
    const wrapper = this.wrapper.nativeElement;
    const context = canvas.getContext('2d');

    (function next(th) {
      if (currentBookIndex >= books.length) {
        console.log('Test Completed');
        return;
      }
      if (th.stopFlag) {
        console.log('Test Stopped');
        return;
      }

      let book = books[currentBookIndex];

      if (!currentBookFilePaths) { // book pages not loaded yet
        th.answerService.getBook(book.id).subscribe(
          book => {
            currentBookFilePaths = th.getDistinctPDFFilePaths(book);
            next(th); //re-call next
          },
          error => th.error = error.error
        )
        return;
      }

      if (currentBookFilePathIndex >= currentBookFilePaths.length) { // stop processing current book
        ++currentBookIndex;
        ++th.testsDone;
        currentBookFilePaths = undefined;
        currentBookFilePathIndex = 0;
        next(th);
        return;
      }

      let path = currentBookFilePaths[currentBookFilePathIndex];
      th.answerService.getBookFile(book.id, path).subscribe(
        data => {
          console.log(`[PDF] Book${book.id} ${path}`);
          pdfjsLib.getDocument({
            data,
            cMapUrl: environment.cMapUrl,
            cMapPacked: true
          }).promise.then(
            doc => {
              const numPages = doc.numPages;
              let currentPageIndex = 1; // start from 1

              const processNextPage = () => {
                if (th.stopFlag) {
                  console.log('Test Stopped');
                  return;
                }
                if (currentPageIndex > numPages) { // stop processing current doc if all pages are processed
                  doc['cleanup']();
                  doc = null; // clear doc reference
                  ++currentBookFilePathIndex;
                  next(th);
                  return
                }
                doc.getPage(currentPageIndex).then(
                  pdfPage => {
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    const zoom = window.devicePixelRatio || 1.0;
                    let width = element.clientWidth;

                    let viewport = pdfPage.getViewport({scale: 1.0});
                    viewport = pdfPage.getViewport({scale: zoom * width / viewport.width});

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    wrapper.style.width = width + 'px';
                    wrapper.style.height = (width * viewport.height / viewport.width) + 'px';

                    pdfPage.render({
                      canvasContext: context,
                      viewport: viewport
                    }).promise.then(() => {
                      pdfPage['cleanup']();
                      pdfPage = null; // clear page reference
                      ++currentPageIndex;
                      processNextPage()  // recursive call
                    });
                  },
                  error => th.error = {
                    msg: `Failed to load PDF page (page ${currentPageIndex})`,
                    detail: error
                  }
                );
              };
              processNextPage();
            },
            error => {
              th.error = {msg: 'Failed to load PDF Document', detail: error}
            }
          )
        },
        error => th.error = error.error
      )
    })(this);
  }

  private getDistinctPDFFilePaths(book: AnswerBook): string[] {
    let paths = new Set<string>();
    for (let page of book.pages) {
      let path = page.file_path;
      if (path.toLowerCase().endsWith('.pdf')) {
        paths.add(path);
      }
    }
    return Array.from(paths);
  }
}
