import {Component, OnInit} from '@angular/core';
import {AnswerBook, BasicError} from "../models";
import {AnswerService} from "../answer.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-answer-book',
  templateUrl: './answer-book.component.html',
  styleUrls: ['./answer-book.component.less']
})
export class AnswerBookComponent implements OnInit {
  error: BasicError;

  bookId: number;
  book: AnswerBook;
  loadingBook: boolean;

  constructor(private answerService: AnswerService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.bookId = parseInt(this.route.snapshot.paramMap.get('book_id'));

    this.loadingBook = true;
    this.answerService.getBook(this.bookId).pipe(
      finalize(() => this.loadingBook = false)
    ).subscribe(
      book => {
        this.book = book;

      },
      error => this.error = error.error
    )
  }

}
