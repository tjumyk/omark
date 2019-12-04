import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {PopupComponent} from "./popup/popup.component";
import {PopupContentComponent} from "./popup-content/popup-content.component";
import {PopupRefComponent} from "./popup-ref/popup-ref.component";
import {UserMiniCardComponent} from "./user-mini-card/user-mini-card.component";
import {TablePaginationToolbarComponent} from "./table-pagination-toolbar/table-pagination-toolbar.component";
import {NotFoundComponent} from "./not-found/not-found.component";
import {ForbiddenComponent} from "./forbidden/forbidden.component";
import {ErrorComponent} from "./error/error.component";
import {HttpClientModule} from "@angular/common/http";
import {FormsModule} from "@angular/forms";
import {PageComponent} from "./page/page.component";
import { HomeComponent } from './home/home.component';
import {AdminComponent} from "./admin/admin.component";
import { AdminExamsComponent } from './admin-exams/admin-exams.component';
import { ExamComponent } from './exam/exam.component';
import { AnswerBookComponent } from './answer-book/answer-book.component';
import { AnswerBooksComponent } from './answer-books/answer-books.component';
import { AdminExamComponent } from './admin-exam/admin-exam.component';
import { AnswerPagePreviewComponent } from './answer-page-preview/answer-page-preview.component';
import { PdfPageViewComponent } from './pdf-page-view/pdf-page-view.component';
import { AnswerBookAnnotatorComponent } from './answer-book-annotator/answer-book-annotator.component';
import { AnswerPageViewComponent } from './answer-page-view/answer-page-view.component';
import { AnswerBookMarkingsViewComponent } from './answer-book-markings-view/answer-book-markings-view.component';
import { AnnotationLayerComponent } from './annotation-layer/annotation-layer.component';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    ForbiddenComponent,
    ErrorComponent,
    PopupComponent,
    PopupContentComponent,
    PopupRefComponent,
    UserMiniCardComponent,
    TablePaginationToolbarComponent,
    PageComponent,
    HomeComponent,
    AdminComponent,
    AdminExamsComponent,
    ExamComponent,
    AnswerBookComponent,
    AnswerBooksComponent,
    AdminExamComponent,
    AnswerPagePreviewComponent,
    PdfPageViewComponent,
    AnswerBookAnnotatorComponent,
    AnswerPageViewComponent,
    AnswerBookMarkingsViewComponent,
    AnnotationLayerComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
