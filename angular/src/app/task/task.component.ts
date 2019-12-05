import {Component, OnInit} from '@angular/core';
import {BasicError, Task} from "../models";
import {TaskService} from "../task.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.less']
})
export class TaskComponent implements OnInit {
  error: BasicError;

  taskId: number;
  task: Task;
  loadingTask: boolean;

  constructor(private taskService: TaskService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.taskId = parseInt(this.route.snapshot.paramMap.get('task_id'));

    this.loadingTask = true;
    this.taskService.getTask(this.taskId).pipe(
      finalize(() => this.loadingTask = false)
    ).subscribe(
      task => {
        this.task = task;
      },
      error => this.error = error.error
    )
  }

}
