import {Component, OnInit} from '@angular/core';
import {BasicError, MarkerQuestionAssignment, Material, Question, Task} from "../models";
import {TaskService} from "../task.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {
  AdminService,
  ImportBooksResponse,
  ImportSource,
  NewMarkerQuestionAssignmentForm,
  NewQuestionForm,
  IMPORT_SOURCES
} from "../admin.service";
import {HttpEventType} from "@angular/common/http";
import {TitleService} from "../title.service";

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

  addingMaterial: boolean;
  newMaterialFile: string;
  addMaterialProgress: number;


  IMPORT_SOURCES=IMPORT_SOURCES;
  importSource: ImportSource;
  importArchive: string;
  importFileNames: string;
  importForceUpdate: boolean;
  importing: boolean;
  importProgress: number;

  activeTab: string = 'questions';

  constructor(private taskService: TaskService,
              private adminService: AdminService,
              private titleService: TitleService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.taskId = parseInt(this.route.snapshot.paramMap.get('task_id'));

    this.loadingTask = true;
    this.taskService.getTask(this.taskId).pipe(
      finalize(() => this.loadingTask = false)
    ).subscribe(
      task => {
        this.titleService.setTitle(task.name, 'Management');
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

  addMaterial(f: NgForm, files: FileList){
    if (f.invalid || files.length < 1)
      return;

    this.addingMaterial = true;
    this.adminService.addMaterial(this.taskId, files.item(0)).pipe(
      finalize(()=>this.addingMaterial=false)
    ).subscribe(
      event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            this.addMaterialProgress = Math.round(100 * event.loaded / event.total);
            break;
          case HttpEventType.Response:
            const resp = event.body as Material;
            this.task.materials.push(resp);
        }
      },
      error => this.error = error.error
    )
  }

  deleteMaterial(mat: Material, index: number, btn: HTMLButtonElement){
    if(!confirm(`Really want to delete material ${mat.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.deleteMaterial(mat.id).pipe(
      finalize(()=>btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      ()=>{
        this.task.materials.splice(index, 1)
      },
      error=>this.error = error.error
    )
  }

  importBooks(f: NgForm, fileList: FileList) {
    if (f.invalid || fileList.length < 1)
      return;

    const archive = fileList.item(0);

    this.importing = true;
    this.adminService.importBooks(this.taskId, this.importSource, archive, this.importFileNames, this.importForceUpdate).pipe(
      finalize(() => this.importing = false)
    ).subscribe(
      event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            this.importProgress = Math.round(100 * event.loaded / event.total);
            break;
          case HttpEventType.Response:
            const resp = event.body as ImportBooksResponse;
            alert(`Imported books: ${resp.num_new_books} new, ${resp.num_updated_books} updated, ${resp.num_skipped_books} skipped`)
        }
      },
      error => this.error = error.error
    )
  }

  toggleTaskLock(task: Task, lock_type: string, btn: HTMLElement) {
    btn.classList.add('loading', 'disabled');
    const lock_attr = lock_type + '_locked';
    if (task[lock_attr]) {
      this.adminService.unlockTask(task.id, lock_type).pipe(
        finalize(() => btn.classList.remove('loading', 'disabled'))
      ).subscribe(
        () => task[lock_attr] = false,
        error => this.error = error.error
      )
    } else {
      this.adminService.lockTask(task.id, lock_type).pipe(
        finalize(() => btn.classList.remove('loading', 'disabled'))
      ).subscribe(
        () => task[lock_attr] = true,
        error => this.error = error.error
      )
    }
  }

  deleteQuestion(q: Question, index: number, btn: HTMLElement) {
    if(!confirm(`Really want to delete Q${q.index} (ID=${q.id})?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.deleteQuestion(q.id).pipe(
      finalize(()=>btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      ()=>{
        this.task.questions.splice(index, 1)
      },
      error=>this.error = error.error
    )
  }

  deleteAssignment(ass: MarkerQuestionAssignment, q: Question, index: number, btn: HTMLElement) {
    if(!confirm(`Really want to remove ${ass.marker.name} from the markers for Q${q.index}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.deleteAssignment(ass.question_id, ass.marker_id).pipe(
      finalize(()=>btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      ()=>{
        q.marker_assignments.splice(index, 1)
      },
      error=>this.error = error.error
    )
  }
}
