import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AnswerBook, BasicError} from "../models";
import {AnswerService, UpdateAnswerBookForm} from "../answer.service";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-answer-book-student-card',
  templateUrl: './answer-book-student-card.component.html',
  styleUrls: ['./answer-book-student-card.component.less']
})
export class AnswerBookStudentCardComponent implements OnInit {
  @Input()
  book: AnswerBook;
  @Input()
  enableAdmin: boolean;
  @Input()
  enablePopup: boolean;

  @Output()
  error = new EventEmitter<BasicError>();

  updatingStudent: boolean;

  constructor(private answerService: AnswerService) { }

  ngOnInit() {
  }

  updateStudent(studentName: string) {
    // Currently, for simplicity, no NgForm is used here.
    const form = new UpdateAnswerBookForm();
    form.student_name = studentName;

    this.updatingStudent = true;
    this.answerService.updateBook(this.book.id, form).pipe(
      finalize(() => this.updatingStudent = false)
    ).subscribe(
      book => {
        // Carefully copy possibly updated fields.
        // Collection fields like 'markings' should not change.
        // If any view elements are rendered statically according to some field, i.e. not bound by Angular, these
        // elements should be updated as well.
        this.book.student_id = book.student_id;
        this.book.student = book.student;
        this.book.modified_at = book.modified_at;
        this.book.modifier_id = book.modifier_id;
        this.book.modifier = book.modifier;
      },
      error => this.error.emit(error.error)
    )
  }

}
