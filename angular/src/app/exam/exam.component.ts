import {Component, OnInit} from '@angular/core';
import {BasicError, Exam} from "../models";
import {ExamService} from "../exam.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-exam',
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.less']
})
export class ExamComponent implements OnInit {
  error: BasicError;

  examId: number;
  exam: Exam;
  loadingExam: boolean;

  constructor(private examService: ExamService,
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

}
