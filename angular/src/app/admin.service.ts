import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {MarkerQuestionAssignment, Question, Task} from "./models";
import {HttpClient, HttpEvent, HttpRequest} from "@angular/common/http";

export class NewTaskForm {
  name: string;
}

export class NewQuestionForm{
  index: number;
  label?: string;
  marks: number;
  description?: string;
}

export class NewMarkerQuestionAssignmentForm {
  qid: number;
  marker_name: string;
}

export class ImportBooksResponse {
  num_new_books: number;
  num_skipped_books: number;
  num_updated_books: number;
}

export class ImportSource {
  id: string;
  name: string;
}

export const IMPORT_SOURCES: ImportSource[] = [
  {id: 'give', name: 'CSE Give'},
  {id: 'submit', name: 'UNSWKG Submit'}
]

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api: string = 'api/admin';

  constructor(private http: HttpClient) {
  }

  addTask(form: NewTaskForm): Observable<Task> {
    return this.http.post<Task>(`${this.api}/tasks`, form)
  }

  lockTask(taskId: number, lock_type: string): Observable<any>{
    return this.http.put(`${this.api}/tasks/${taskId}/${lock_type}-lock`, null)
  }

  unlockTask(taskId: number, lock_type: string): Observable<any>{
    return this.http.delete(`${this.api}/tasks/${taskId}/${lock_type}-lock`)
  }

  addQuestion(taskId: number, form: NewQuestionForm) :Observable<Question>{
    return this.http.post<Question>(`${this.api}/tasks/${taskId}/questions`, form)
  }

  deleteQuestion(qId: number): Observable<any> {
    return this.http.delete(`${this.api}/questions/${qId}`)
  }

  addAssignment(taskId: number, form: NewMarkerQuestionAssignmentForm): Observable<MarkerQuestionAssignment> {
    return this.http.post<MarkerQuestionAssignment>(`${this.api}/tasks/${taskId}/assignments`, form)
  }

  deleteAssignment(qId: number, uId: number): Observable<any> {
    return this.http.delete(`${this.api}/questions/${qId}/assignments/${uId}`)
  }

  importBooks(taskId: number, source: ImportSource, archive: File, fileNames: string, forceUpdate: boolean): Observable<HttpEvent<any>> {
    const form = new FormData();
    form.append('archive', archive);
    form.append('file_names', fileNames);
    if (forceUpdate) {
      form.append('force_update', 'true');
    }
    const req = new HttpRequest('POST', `${this.api}/tasks/${taskId}/import-${source.id}`,
      form, {reportProgress: true});
    return this.http.request(req);
  }

  deleteBook(bookId: number) :Observable<any>{
    return this.http.delete(`${this.api}/books/${bookId}`)
  }

  deletePage(pageId: number) :Observable<any>{
    return this.http.delete(`${this.api}/pages/${pageId}`)
  }

  addMaterial(taskId: number, file: File): Observable<HttpEvent<any>> {
    let form = new FormData();
    form.append('file', file);
    const req = new HttpRequest('POST', `${this.api}/tasks/${taskId}/materials`, form,
      {reportProgress: true});
    return this.http.request(req);
  }

  deleteMaterial(materialId: number): Observable<any> {
    return this.http.delete(`${this.api}/materials/${materialId}`)
  }
}
