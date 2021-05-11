import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerBook, BasicError, Marking, Question, Task, User} from "../models";
import {AccountService} from "../account.service";
import {MarkingService, UpdateMarkingForm} from "../marking.service";
import {AnswerService, NewMarkingForm} from "../answer.service";
import {finalize} from "rxjs/operators";
import {KeyValue} from "@angular/common";

export class QuestionInfo{
  question: Question;
  marking: Marking;
  assigned: boolean;
  submitting: boolean;
  editing: boolean;
  initialMarks: number;
}

@Component({
  selector: 'app-answer-book-markings-view',
  templateUrl: './answer-book-markings-view.component.html',
  styleUrls: ['./answer-book-markings-view.component.less']
})
export class AnswerBookMarkingsViewComponent implements OnInit {
  @Input()
  task: Task;
  @Input()
  book: AnswerBook;

  @Output()
  error = new EventEmitter<BasicError>();

  user: User;

  qMap: {[qid: number]: QuestionInfo} = {};
  total: number;

  constructor(private accountService: AccountService,
              private answerService: AnswerService,
              private markingService: MarkingService) {
  }

  ngOnInit() {
    this.accountService.getCurrentUser().subscribe(
      user => {
        this.user = user;

        for (let question of this.task.questions) {
          const info = new QuestionInfo();
          this.qMap[question.id] = info;
          info.question = question;

          for (let ass of question.marker_assignments) {
            if (ass.marker_id == user.id) {
              info.assigned = true;
            }
          }
        }

        for (let marking of this.book.markings) {
          const info = this.qMap[marking.question_id];
          info.marking = marking;
        }

        if(!this.task.marking_locked){
          for(let question of this.task.questions){
            const info = this.qMap[question.id];
            info.editing = info.assigned && !info.marking;
          }
        }

        this.updateTotal();
      },
      error => this.error.emit(error.error)
    )
  }

  addMarking(question: Question, marks: any) {
    const info = this.qMap[question.id];
    if (typeof marks == 'string')
      marks = parseFloat(marks);

    const form = new NewMarkingForm();
    form.qid = question.id;
    form.marks = marks;

    info.submitting = true;
    this.answerService.addMarking(this.book.id, form).pipe(
      finalize(() => info.submitting = false)
    ).subscribe(
      marking => {
        this.book.markings.push(marking);
        info.marking = marking;
        info.editing = false;
        this.updateTotal();
      },
      error => this.error.emit(error.error)
    )
  }

  updateMarking(question: Question, marking: Marking, marks: any) {
    const info = this.qMap[question.id];
    if (typeof marks == 'string')
      marks = parseFloat(marks);

    const form = new UpdateMarkingForm();
    form.marks = marks;

    info.submitting = true;
    this.markingService.updateMarking(marking.id, form).pipe(
      finalize(() => info.submitting = false)
    ).subscribe(
      _marking => {
        let mIndex = -1, i = 0;
        for(let m of this.book.markings){
          if(m.id == _marking.id){
            mIndex = i;
            break;
          }
          ++i;
        }
        if(mIndex >= 0)
          this.book.markings.splice(mIndex, 1, _marking);
        info.marking = _marking;
        info.editing = false;
        this.updateTotal();
      },
      error => this.error.emit(error.error)
    )
  }

  startUpdateMarking(question: Question) {
    const info = this.qMap[question.id];
    info.initialMarks = info.marking.marks;
    info.editing = true;
  }

  updateTotal(){
    if (this.book.markings.length > 0) {
      let total = 0;
      for (let marking of this.book.markings) {
        const info = this.qMap[marking.question_id];
        if(!info.question.excluded_from_total)
          total += marking.marks;
      }
      this.total = total;
    } else {
      this.total = undefined;
    }
  }

  compareQMapItems(a: KeyValue<number, QuestionInfo>, b: KeyValue<number, QuestionInfo>): number {
    return a.value.question.index - b.value.question.index
  }
}
