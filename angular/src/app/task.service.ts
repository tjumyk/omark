import {Injectable} from '@angular/core';
import {Observable, of} from "rxjs";
import {AnswerBook, Task} from "./models";
import {HttpClient} from "@angular/common/http";
import {tap} from "rxjs/operators";

export class NewAnswerBookForm {
  student_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private api: string = 'api/tasks';
  private cachedTasks: { [id: number]: Task } = {};

  constructor(private http: HttpClient) {
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.api + '/')
  }

  getTask(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.api}/${id}`).pipe(
      tap(task => {
        this.cachedTasks[id] = task
      })
    )
  }

  getCachedTask(id: number): Observable<Task> {
    const task = this.cachedTasks[id];
    if (task)
      return of(task);
    return this.getTask(id);
  }

  getAnswerBooks(id: number): Observable<AnswerBook[]> {
    return this.http.get<AnswerBook[]>(`${this.api}/${id}/answer-books`)
  }

  addAnswerBook(id: number, form: NewAnswerBookForm): Observable<AnswerBook> {
    return this.http.post<AnswerBook>(`${this.api}/${id}/answer-books`, form)
  }
}
