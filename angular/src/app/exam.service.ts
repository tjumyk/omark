import {Injectable} from '@angular/core';
import {Observable, of} from "rxjs";
import {AnswerBook, Exam} from "./models";
import {HttpClient} from "@angular/common/http";
import {tap} from "rxjs/operators";

export class NewAnswerBookForm {
  sid?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private api: string = 'api/exams';
  private cachedExams: { [id: number]: Exam } = {};

  constructor(private http: HttpClient) {
  }

  getExams(): Observable<Exam[]> {
    return this.http.get<Exam[]>(this.api + '/')
  }

  getExam(id: number): Observable<Exam> {
    return this.http.get<Exam>(`${this.api}/${id}`).pipe(
      tap(exam => {
        this.cachedExams[id] = exam
      })
    )
  }

  getCachedExam(id: number): Observable<Exam> {
    const exam = this.cachedExams[id];
    if (exam)
      return of(exam);
    return this.getExam(id);
  }

  getAnswerBooks(id: number): Observable<AnswerBook[]> {
    return this.http.get<AnswerBook[]>(`${this.api}/${id}/answer-books`)
  }

  addAnswerBook(id: number, form: NewAnswerBookForm): Observable<AnswerBook> {
    return this.http.post<AnswerBook>(`${this.api}/${id}/answer-books`, form)
  }
}
