import {Component, OnInit} from '@angular/core';
import {BasicError, Task, User} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {TaskService} from "../task.service";

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

  tasks: Task[];
  loadingTasks: boolean;

  constructor(private accountService: AccountService,
              private taskService: TaskService) {
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

        this.loadingTasks = true;
        this.taskService.getTasks().pipe(
          finalize(() => this.loadingTasks = false)
        ).subscribe(
          tasks => {
            this.tasks = tasks
          },
          error => this.error = error.error
        )
      },
      error => this.error = error.error
    )
  }

}
