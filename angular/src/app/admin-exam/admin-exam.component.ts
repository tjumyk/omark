import {Component, OnInit} from '@angular/core';
import {BasicError, Exam} from "../models";
import {ExamService} from "../exam.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {AdminService, NewMarkerQuestionAssignmentForm, NewQuestionForm} from "../admin.service";

@Component({
  selector: 'app-admin-exam',
  templateUrl: './admin-exam.component.html',
  styleUrls: ['./admin-exam.component.less']
})
export class AdminExamComponent implements OnInit {
  error: BasicError;

  examId: number;
  exam: Exam;
  loadingExam: boolean;

  newQuestionForm = new NewQuestionForm();
  addingQuestion: boolean;

  newAssignmentForm = new NewMarkerQuestionAssignmentForm();
  addingAssignment: boolean;

  constructor(private examService: ExamService,
              private adminService: AdminService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.examId = parseInt(this.route.snapshot.paramMap.get('exam_id'));

    this.loadingExam = true;
    this.examService.getExam(this.examId).pipe(
      finalize(() => this.loadingExam = false)
    ).subscribe(
      exam => {
        this.exam = exam;
      },
      error => this.error = error.error
    )
  }

  addQuestion(f: NgForm) {
    if (f.invalid)
      return;

    this.addingQuestion = true;
    this.adminService.addQuestion(this.examId, this.newQuestionForm).pipe(
      finalize(() => this.addingQuestion = false)
    ).subscribe(
      q => {
        this.exam.questions.push(q);
      },
      error => this.error = error.error
    )
  }

  addAssignment(f: NgForm) {
    if (f.invalid)
      return;

    this.addingAssignment = true;
    this.adminService.addAssignment(this.examId, this.newAssignmentForm).pipe(
      finalize(() => this.addingAssignment = false)
    ).subscribe(
      ass => {
        for (let q of this.exam.questions) {
          if (q.id == this.newAssignmentForm.qid) {
            q.marker_assignments.push(ass);
            break;
          }
        }
      },
      error => this.error = error.error
    )
  }

}
