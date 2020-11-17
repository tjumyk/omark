import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerBook, BasicError, Task, User} from "../models";
import {finalize} from "rxjs/operators";
import {AnswerService} from "../answer.service";
import {Router} from "@angular/router";
import {NewAnswerBookForm, TaskService} from "../task.service";
import {AccountService} from "../account.service";

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

  user: User;
  hasAssignment: boolean;

  @Output()
  error = new EventEmitter<BasicError>();

  constructor(private accountService: AccountService,
              private taskService:TaskService,
              private answerService: AnswerService,
              private router: Router) { }

  ngOnInit() {
    this.accountService.getCurrentUser().subscribe(
      user=>{
        this.user = user;

        if(this.task){
          this.hasAssignment = false;
          for(let question of this.task.questions){
            for(let ass of question.marker_assignments){
              if(ass.marker_id == user.id){
                this.hasAssignment = true;
                break;
              }
            }
            if(this.hasAssignment)
              break;
          }
        }
      },
      error=>this.error =error.error
    )
  }

  goToBook(btn: HTMLButtonElement, isNext: boolean, skipMarked: boolean = false) {
    btn.classList.add('loading', 'disabled');
    this.answerService.goToBook(this.currentBook.id, isNext, false, skipMarked).pipe(
      finalize(()=>{btn.classList.remove('loading', 'disabled')})
    ).subscribe(
      _book => {
        if (_book) {
          this.router.navigate([`/tasks/${this.task.id}/books/${_book.id}`]);
        } else {
          if (isNext) {
            if(skipMarked)
              alert('No more next unmarked books');
            else
              alert('No more next books');
          }else
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
