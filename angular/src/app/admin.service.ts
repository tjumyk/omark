import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {Task, MarkerQuestionAssignment, Question} from "./models";
import {HttpClient, HttpEvent, HttpRequest} from "@angular/common/http";

export class NewTaskForm {
  name: string;
}

export class NewQuestionForm{
  index: number;
  marks: number;
  description?: string;
}

export class NewMarkerQuestionAssignmentForm{
  qid: number;
  marker_name: string;
}

export class ImportGiveResponse{
  num_books: number;
}

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

  lockTask(taskId: number): Observable<any>{
    return this.http.put(`${this.api}/tasks/${taskId}/lock`, null)
  }

  unlockTask(taskId: number): Observable<any>{
    return this.http.delete(`${this.api}/tasks/${taskId}/lock`)
  }

  addQuestion(taskId: number, form: NewQuestionForm) :Observable<Question>{
    return this.http.post<Question>(`${this.api}/tasks/${taskId}/questions`, form)
  }

  addAssignment(taskId: number, form: NewMarkerQuestionAssignmentForm):Observable<MarkerQuestionAssignment> {
    return this.http.post<MarkerQuestionAssignment>(`${this.api}/tasks/${taskId}/assignments`, form)
  }

  importGiveSubmissions(taskId: number, archive: File, fileNames: string): Observable<HttpEvent<any>>{
    const form = new FormData();
    form.append('archive', archive);
    form.append('file_names', fileNames);
    const req = new HttpRequest('POST', `${this.api}/tasks/${taskId}/import-give`,
      form, {reportProgress: true});
    return this.http.request(req);
  }

  deleteBook(bookId: number) :Observable<any>{
    return this.http.delete(`${this.api}/books/${bookId}`)
  }

  deletePage(pageId: number) :Observable<any>{
    return this.http.delete(`${this.api}/pages/${pageId}`)
  }
}
