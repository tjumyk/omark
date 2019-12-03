import {Component, OnInit} from '@angular/core';
import {AnswerBook, AnswerPage, BasicError, Exam} from "../models";
import {AnswerService, PDFCache, PDFCacheEntry} from "../answer.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {HttpEventType} from "@angular/common/http";
import * as pdfjsLib from "pdfjs-dist/webpack";
import {ExamService} from "../exam.service";

@Component({
  selector: 'app-answer-book',
  templateUrl: './answer-book.component.html',
  styleUrls: ['./answer-book.component.less']
})
export class AnswerBookComponent implements OnInit {
  error: BasicError;

  examId: number;
  exam: Exam;

  bookId: number;
  book: AnswerBook;
  loadingBook: boolean;

  addingPages: boolean;
  addPagesProgress: number;

  pdfCache: PDFCache = {};

  annotatorShown: boolean;
  annotatorStartPageIndex: number;

  constructor(private examService: ExamService,
              private answerService: AnswerService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.examId = parseInt(this.route.parent.snapshot.paramMap.get('exam_id'));
    this.bookId = parseInt(this.route.snapshot.paramMap.get('book_id'));

    this.examService.getCachedExam(this.examId).subscribe(
      exam=>{
        this.exam = exam;

        this.loadingBook = true;
        this.answerService.getBook(this.bookId).pipe(
          finalize(() => this.loadingBook = false)
        ).subscribe(
          book => {
            if(book.exam_id != this.examId){
              this.error = {msg: 'book does not belong to this exam'};
              return;
            }

            this.book = book;

            for (let page of book.pages) {
              this.processPage(page);
            }
          },
          error => this.error = error.error
        )
      },
      error=>this.error = error.error
    )
  }

  private processPage(page: AnswerPage) {
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
                    page => {
                      entry.pages[i-1] = page;
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
    }
  }

  addPages(files: FileList) {
    if (!files.length)
      return;

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
            for (let page of pages) {
              this.processPage(page)
            }
            this.book.pages.push(...pages)
        }
      },
      error => this.error = error.error
    )
  }

  showAnnotator(startPageIndex: number){
    window.document.body.style.overflowY = 'hidden';
    this.annotatorStartPageIndex = startPageIndex;
    this.annotatorShown = true;
  }

  hideAnnotator(){
    window.document.body.style.overflowY = null;
    this.annotatorShown = false;
  }

}
