import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerBook, BasicError, Task} from "../models";
import {finalize} from "rxjs/operators";
import {AnswerService} from "../answer.service";
import {Router} from "@angular/router";
import {NewAnswerBookForm, TaskService} from "../task.service";

@Component({
  selector: 'app-answer-book-navigation-card',
  templateUrl: './answer-book-navigation-card.component.html',
  styleUrls: ['./answer-book-navigation-card.component.less']
})
export class AnswerBookNavigationCardComponent implements OnInit {
  @Input()
  task: Task;
  @Input()
  currentBook:AnswerBook;
  @Input()
  darkMode:boolean;
  @Input()
  enableNewBook: boolean;

  @Output()
  error = new EventEmitter<BasicError>();

  constructor(private taskService:TaskService,
              private answerService: AnswerService,
              private router: Router) { }

  ngOnInit() {
  }

  goToBook(btn: HTMLButtonElement, isNext: boolean) {
    btn.classList.add('loading', 'disabled');
    this.answerService.goToBook(this.currentBook.id, isNext).pipe(
      finalize(()=>{btn.classList.remove('loading', 'disabled')})
    ).subscribe(
      _book => {
        if (_book) {
          this.router.navigate([`/tasks/${this.task.id}/books/${_book.id}`]);
        } else {
          if (isNext)
            alert('No more next books');
          else
            alert('No more previous books');
        }
      },
      error => this.error.emit(error.error)
    )
  }

  addBook(btn: HTMLElement) {
    const form = new NewAnswerBookForm();  // use an empty form for simplicity

    btn.classList.add('loading', 'disabled');
    this.taskService.addAnswerBook(this.task.id, form).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      _book => {
        this.router.navigate([`/tasks/${this.task.id}/books/${_book.id}`]);
      },
      error => this.error.emit(error.error)
    )
  }
}
