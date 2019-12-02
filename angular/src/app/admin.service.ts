import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {Exam, MarkerQuestionAssignment, Question} from "./models";
import {HttpClient} from "@angular/common/http";

export class NewExamForm {
  name: string;
}

export class NewQuestionForm{
  index: number;
  marks: number;
  description?: string;
}

export class NewMarkerQuestionAssignmentForm{
  qid: number;
  mid: string;
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

  lockExam(exam_id: number): Observable<any>{
    return this.http.put(`${this.api}/exams/${exam_id}/lock`, null)
  }

  unlockExam(exam_id: number): Observable<any>{
    return this.http.delete(`${this.api}/exams/${exam_id}/lock`)
  }

  addQuestion(exam_id: number, form: NewQuestionForm) :Observable<Question>{
    return this.http.post<Question>(`${this.api}/exams/${exam_id}/questions`, form)
  }

  addAssignment(examId: number, form: NewMarkerQuestionAssignmentForm):Observable<MarkerQuestionAssignment> {
    return this.http.post<MarkerQuestionAssignment>(`${this.api}/exams/${examId}/assignments`, form)
  }
}
