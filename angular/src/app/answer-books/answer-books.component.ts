import {Component, OnInit} from '@angular/core';
import {AnswerBook, BasicError, Question, Task, User} from "../models";
import {ActivatedRoute} from "@angular/router";
import {NewAnswerBookForm, TaskService} from "../task.service";
import {debounceTime, finalize} from "rxjs/operators";
import {makeSortField, Pagination} from "../table-util";
import {NgForm} from "@angular/forms";
import {AccountService} from "../account.service";
import {Subject} from "rxjs";
import {AdminService} from "../admin.service";
import {TitleService} from "../title.service";
import * as moment from "moment";

@Component({
  selector: 'app-answer-books',
  templateUrl: './answer-books.component.html',
  styleUrls: ['./answer-books.component.less']
})
export class AnswerBooksComponent implements OnInit {
  error: BasicError;

  user: User;
  isAdmin: boolean;

  taskId: number;
  task: Task;

  questionMap: {[key: number]: Question} = {};
  books: AnswerBook[];
  loadingBooks: boolean;
  bookPages: Pagination<AnswerBook>;
  bookSearchKey = new Subject<string>();
  sortField: (field: string, th: HTMLElement) => any;

  newBookForm = new NewAnswerBookForm();
  addingBook: boolean;

  hasSubmittedAt: boolean;

  constructor(private accountService: AccountService,
              private adminService: AdminService,
              private taskService: TaskService,
              private titleService: TitleService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.taskId = parseInt(this.route.parent.snapshot.paramMap.get('task_id'));

    this.accountService.getCurrentUser().subscribe(
      user=>{
        this.user = user;
        this.isAdmin = AccountService.isAdmin(user);

        this.taskService.getCachedTask(this.taskId).subscribe(
          task => {
            this.task = task;
            this.titleService.setTitle(task.name);
            this.questionMap = {};
            for(let q of task.questions){
              this.questionMap[q.id] = q;
            }

            this.loadingBooks = true;
            this.taskService.getAnswerBooks(this.taskId).pipe(
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
    if(book.submitted_at){
      book['_submitted_at_time'] = moment(book.submitted_at).unix()
    }

    if(book.markings){
      let total = 0;
      for(let marking of book.markings){
        let qid = marking.question_id;
        book['_marks_' + qid] = marking.marks;
        if(!this.questionMap[qid].excluded_from_total)
          total += marking.marks;
      }
      if(book.markings.length > 0)
        book['_total_marks'] = total;
    }
  }

  private setupBooks(books: AnswerBook[]) {
    this.books = books;

    this.hasSubmittedAt = false;
    for(let book of books){
      this.setupBook(book);
      if(book.submitted_at){
        this.hasSubmittedAt = true;
      }
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
      if (item.comments) {
        for (let comment of item.comments) {
          if (comment.content.toLowerCase().indexOf(keyLower) >= 0)
            return true;
        }
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
    this.taskService.addAnswerBook(this.taskId, this.newBookForm).pipe(
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

  deleteBook(book: AnswerBook, btn: HTMLButtonElement, index: number) {
    let studentInfo = '';
    if (book.student) {
      studentInfo = ` from student ${book.student.name}`
    }
    if (!confirm(`Really want to delete book ${book.id}${studentInfo}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.deleteBook(book.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      () => {
        // assume book list is static after loaded
        this.books.splice(index, 1);
        this.bookPages.reload();
      },
      error => this.error = error.error
    )
  }
}
