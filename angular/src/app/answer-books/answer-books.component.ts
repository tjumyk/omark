import {Component, OnInit} from '@angular/core';
import {AnswerBook, BasicError, Exam, User} from "../models";
import {ActivatedRoute} from "@angular/router";
import {ExamService, NewAnswerBookForm} from "../exam.service";
import {debounceTime, finalize} from "rxjs/operators";
import {makeSortField, Pagination} from "../table-util";
import {NgForm} from "@angular/forms";
import {AccountService} from "../account.service";
import {Subject} from "rxjs";

@Component({
  selector: 'app-answer-books',
  templateUrl: './answer-books.component.html',
  styleUrls: ['./answer-books.component.less']
})
export class AnswerBooksComponent implements OnInit {
  error: BasicError;

  user: User;
  isAdmin: boolean;

  examId: number;
  exam: Exam;

  books: AnswerBook[];
  loadingBooks: boolean;
  bookPages: Pagination<AnswerBook>;
  bookSearchKey = new Subject<string>();
  sortField: (field: string, th: HTMLElement) => any;

  newBookForm = new NewAnswerBookForm();
  addingBook: boolean;

  constructor(private accountService: AccountService,
              private examService: ExamService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.examId = parseInt(this.route.parent.snapshot.paramMap.get('exam_id'));

    this.accountService.getCurrentUser().subscribe(
      user=>{
        this.user = user;
        this.isAdmin = AccountService.isAdmin(user);

        this.examService.getCachedExam(this.examId).subscribe(
          exam => {
            this.exam = exam;

            this.loadingBooks = true;
            this.examService.getAnswerBooks(this.examId).pipe(
              finalize(() => this.loadingBooks = false)
            ).subscribe(
              books => {
                this.setupBooks(books);
              },
              error => this.error = error.error
            )
          },
          error => this.error = error.error
        )
      },
      error=>this.error = error.error
    )
  }

  private setupBook(book: AnswerBook){
    if(book.markings){
      let total = 0;
      for(let marking of book.markings){
        book['_marks_' + marking.question_id] = marking.marks;
        total += marking.marks;
      }
      if(book.markings.length > 0)
        book['_total_marks'] = total;
    }
  }

  private setupBooks(books: AnswerBook[]) {
    this.books = books;

    for(let book of books){
      this.setupBook(book)
    }

    this.bookPages = new Pagination(books, 500);
    this.bookPages.setSearchMatcher((item, key) => {
      const keyLower = key.toLowerCase();
      if (item.id.toString().indexOf(keyLower) >= 0)
        return true;
      if (item.student_id) {
        if (item.student_id.toString().indexOf(keyLower) >= 0)
          return true;
        if (item.student.name.toLowerCase().indexOf(keyLower) >= 0)
          return true;
        if (item.student.nickname && item.student.nickname.toLowerCase().indexOf(keyLower) >= 0)
          return true;
      }
      return false;
    });

    this.sortField = makeSortField(this.bookPages);

    this.bookSearchKey.pipe(
      debounceTime(300)
    ).subscribe(
      (key) => this.bookPages.search(key),
      error => this.error = error.error
    );
  }

  addBook(f: NgForm) {
    if (f.invalid)
      return;

    this.addingBook = true;
    this.examService.addAnswerBook(this.examId, this.newBookForm).pipe(
      finalize(() => this.addingBook = false)
    ).subscribe(
      book => {
        this.setupBook(book);
        this.books.push(book);
        this.bookPages.reload();
      },
      error => this.error = error.error
    )
  }

}
