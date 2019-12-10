import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerBook} from "../models";
import {finalize} from "rxjs/operators";
import {AnswerService} from "../answer.service";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-answer-book-navigation-card',
  templateUrl: './answer-book-navigation-card.component.html',
  styleUrls: ['./answer-book-navigation-card.component.less']
})
export class AnswerBookNavigationCardComponent implements OnInit {
  @Input()
  darkMode:boolean;
  @Input()
  currentBook:AnswerBook;

  @Output()
  error = new EventEmitter<void>();

  constructor(private answerService: AnswerService,
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
          this.router.navigate([`/tasks/${_book.task_id}/books/${_book.id}`]);
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

}
