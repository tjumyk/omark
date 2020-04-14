import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {AnswerBook, BasicError, Task, User, Comment} from "../models";
import {AccountService} from "../account.service";
import {AnswerService, NewCommentForm} from "../answer.service";
import {MarkingService, UpdateCommentForm} from "../marking.service";
import * as moment from "moment";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-answer-book-comments-view',
  templateUrl: './answer-book-comments-view.component.html',
  styleUrls: ['./answer-book-comments-view.component.less']
})
export class AnswerBookCommentsViewComponent implements OnInit, OnDestroy {
  @Input()
  task: Task;
  @Input()
  book: AnswerBook;
  @Input()
  darkMode: boolean;

  @Output()
  error = new EventEmitter<BasicError>();

  user: User;
  isAdmin: boolean;

  timeTrackerHandler: number;

  addingComment: boolean;
  newCommentForm: NewCommentForm = new NewCommentForm();

  constructor(private accountService: AccountService,
              private answerService: AnswerService,
              private markingService: MarkingService) { }

  ngOnInit() {
    this.accountService.getCurrentUser().subscribe(
      user => {
        this.user = user;
        this.isAdmin = AccountService.isAdmin(user);

        this.setupTimeTracker()
      },
      error => this.error.emit(error.error)
    )
  }

  ngOnDestroy(): void {
    clearInterval(this.timeTrackerHandler);
  }

  private setupTimeTracker() {
    const timeTracker = () => {
      for (let comment of this.book.comments) {
        this.updateTimeFields(comment)
      }
    };
    timeTracker();
    this.timeTrackerHandler = setInterval(timeTracker, 30 * 1000);
  }

  private updateTimeFields(comment: Comment) {
    comment['_created_at_from_now'] = moment(comment.created_at).fromNow();
    comment['_modified_at_from_now'] = moment(comment.modified_at).fromNow();
  }

  addComment(f: NgForm) {
    if (f.invalid)
      return;

    this.addingComment = true;
    this.answerService.addComment(this.book.id, this.newCommentForm).pipe(
      finalize(() => this.addingComment = false)
    ).subscribe(
      comment => {
        this.book.comments.push(comment);
        this.updateTimeFields(comment);
        f.resetForm();
      },
      error=>this.error.emit(error.error)
    )
  }

  editComment(comment: Comment){
    comment['_editor_content'] = comment.content;
    comment['_editing'] = true;
  }

  cancelEditComment(comment: Comment){
    comment['_editing'] = false;
  }

  updateComment(f: NgForm, comment:Comment) {
    if (f.invalid)
      return;

    comment['_updating'] = true;
    let form = new UpdateCommentForm();
    form.content = comment['_editor_content'];
    this.markingService.updateComment(comment.id, form).pipe(
      finalize(() => {
        comment['_updating'] = false;
        comment['_editing'] = false;
        comment['_editor_content'] = undefined;
      })
    ).subscribe(
      _comment => {
        comment.content = _comment.content;
        comment.modified_at = _comment.modified_at;

        this.updateTimeFields(comment);
      },
      error=>this.error.emit(error.error)
    )
  }

  removeComment(comment: Comment, btn: HTMLElement, index: number) {
    let excerpt = comment.content.substr(0, 32);
    if(excerpt.length < comment.content.length)
      excerpt += '...';
    if (!confirm(`Really want to delete comment "${excerpt}"?`))
      return;

    btn.classList.add('disabled', 'loading');
    this.markingService.deleteComment(comment.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe(
      () => {
        this.book.comments.splice(index, 1);
      },
      error => this.error.emit(error.error)
    )
  }

}
