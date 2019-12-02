import {Component, OnInit} from '@angular/core';
import {ExamService} from "../exam.service";
import {BasicError, Exam} from "../models";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {AdminService, NewExamForm} from "../admin.service";

@Component({
  selector: 'app-admin-exams',
  templateUrl: './admin-exams.component.html',
  styleUrls: ['./admin-exams.component.less']
})
export class AdminExamsComponent implements OnInit {
  error: BasicError;

  exams: Exam[];
  loadingExams: boolean;

  newExamForm = new NewExamForm();
  addingExam: boolean;


  constructor(private examService: ExamService,
              private adminService: AdminService) {
  }

  ngOnInit() {
    this.loadingExams = true;
    this.examService.getExams().pipe(
      finalize(() => this.loadingExams = false)
    ).subscribe(
      exams => {
        this.exams = exams;
      },
      error => this.error = error.error
    )
  }

  addExam(f: NgForm) {
    if (f.invalid)
      return;

    this.addingExam = true;
    this.adminService.addExam(this.newExamForm).pipe(
      finalize(() => this.addingExam = false)
    ).subscribe(
      exam => {
        this.exams.push(exam)
      },
      error => this.error = error.error
    )
  }

  toggleExamLock(exam: Exam, btn: HTMLElement) {
    btn.classList.add('loading', 'disabled');
    if (exam.is_locked) {
      this.adminService.unlockExam(exam.id).pipe(
        finalize(() => btn.classList.remove('loading', 'disabled'))
      ).subscribe(
        () => exam.is_locked = false,
        error => this.error = error.error
      )
    } else {
      this.adminService.lockExam(exam.id).pipe(
        finalize(() => btn.classList.remove('loading', 'disabled'))
      ).subscribe(
        () => exam.is_locked = true,
        error => this.error = error.error
      )
    }
  }

}
