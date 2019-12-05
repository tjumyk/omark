import {Component, OnInit} from '@angular/core';
import {TaskService} from "../task.service";
import {BasicError, Task} from "../models";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {AdminService, NewTaskForm} from "../admin.service";

@Component({
  selector: 'app-admin-tasks',
  templateUrl: './admin-tasks.component.html',
  styleUrls: ['./admin-tasks.component.less']
})
export class AdminTasksComponent implements OnInit {
  error: BasicError;

  tasks: Task[];
  loadingTasks: boolean;

  newTaskForm = new NewTaskForm();
  addingTask: boolean;


  constructor(private taskService: TaskService,
              private adminService: AdminService) {
  }

  ngOnInit() {
    this.loadingTasks = true;
    this.taskService.getTasks().pipe(
      finalize(() => this.loadingTasks = false)
    ).subscribe(
      tasks => {
        this.tasks = tasks;
      },
      error => this.error = error.error
    )
  }

  addTask(f: NgForm) {
    if (f.invalid)
      return;

    this.addingTask = true;
    this.adminService.addTask(this.newTaskForm).pipe(
      finalize(() => this.addingTask = false)
    ).subscribe(
      task => {
        this.tasks.push(task)
      },
      error => this.error = error.error
    )
  }

  toggleTaskLock(task: Task, btn: HTMLElement) {
    btn.classList.add('loading', 'disabled');
    if (task.is_locked) {
      this.adminService.unlockTask(task.id).pipe(
        finalize(() => btn.classList.remove('loading', 'disabled'))
      ).subscribe(
        () => task.is_locked = false,
        error => this.error = error.error
      )
    } else {
      this.adminService.lockTask(task.id).pipe(
        finalize(() => btn.classList.remove('loading', 'disabled'))
      ).subscribe(
        () => task.is_locked = true,
        error => this.error = error.error
      )
    }
  }

}
