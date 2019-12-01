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

}
