import {Component, OnInit} from '@angular/core';
import {BasicError, Exam, User} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {ExamService} from "../exam.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit {
  error: BasicError;

  user: User;
  loadingUser: boolean;
  isAdmin: boolean;

  exams: Exam[];
  loadingExams: boolean;

  constructor(private accountService: AccountService,
              private examService: ExamService) {
  }

  ngOnInit() {
    this.loadingUser = true;
    this.accountService.getCurrentUser().pipe(
      finalize(() => {
        this.loadingUser = false
      })
    ).subscribe(
      user => {
        this.user = user;
        this.isAdmin = AccountService.isAdmin(user);

        this.loadingExams = true;
        this.examService.getExams().pipe(
          finalize(() => this.loadingExams = false)
        ).subscribe(
          exams => {
            this.exams = exams
          },
          error => this.error = error.error
        )
      },
      error => this.error = error.error
    )
  }

}
