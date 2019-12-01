import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {Exam} from "./models";
import {HttpClient} from "@angular/common/http";

export class NewExamForm {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api: string = 'api/admin';

  constructor(private http: HttpClient) {
  }

  addExam(form: NewExamForm): Observable<Exam> {
    return this.http.post<Exam>(`${this.api}/exams`, form)
  }
}
