import {Component, OnInit} from '@angular/core';
import {BasicError, Task} from "../models";
import {TaskService} from "../task.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {AdminService, NewMarkerQuestionAssignmentForm, NewQuestionForm} from "../admin.service";

@Component({
  selector: 'app-admin-task',
  templateUrl: './admin-task.component.html',
  styleUrls: ['./admin-task.component.less']
})
export class AdminTaskComponent implements OnInit {
  error: BasicError;

  taskId: number;
  task: Task;
  loadingTask: boolean;

  newQuestionForm = new NewQuestionForm();
  addingQuestion: boolean;

  newAssignmentForm = new NewMarkerQuestionAssignmentForm();
  addingAssignment: boolean;

  constructor(private taskService: TaskService,
              private adminService: AdminService,
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

  addQuestion(f: NgForm) {
    if (f.invalid)
      return;

    this.addingQuestion = true;
    this.adminService.addQuestion(this.taskId, this.newQuestionForm).pipe(
      finalize(() => this.addingQuestion = false)
    ).subscribe(
      q => {
        this.task.questions.push(q);
      },
      error => this.error = error.error
    )
  }

  addAssignment(f: NgForm) {
    if (f.invalid)
      return;

    this.addingAssignment = true;
    this.adminService.addAssignment(this.taskId, this.newAssignmentForm).pipe(
      finalize(() => this.addingAssignment = false)
    ).subscribe(
      ass => {
        for (let q of this.task.questions) {
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
