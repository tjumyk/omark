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
import { AdminTasksComponent } from './admin-tasks/admin-tasks.component';
import { TaskComponent } from './task/task.component';
import { AnswerBookComponent } from './answer-book/answer-book.component';
import { AnswerBooksComponent } from './answer-books/answer-books.component';
import { AdminTaskComponent } from './admin-task/admin-task.component';
import { AnswerPagePreviewComponent } from './answer-page-preview/answer-page-preview.component';
import { PdfPageViewComponent } from './pdf-page-view/pdf-page-view.component';
import { AnswerBookAnnotatorComponent } from './answer-book-annotator/answer-book-annotator.component';
import { AnswerPageViewComponent } from './answer-page-view/answer-page-view.component';
import { AnswerBookMarkingsViewComponent } from './answer-book-markings-view/answer-book-markings-view.component';
import { AnswerPageAnnotationLayerComponent } from './answer-page-annotation-layer/answer-page-annotation-layer.component';
import { PageWideComponent } from './page-wide/page-wide.component';
import { PageFooterComponent } from './page-footer/page-footer.component';
import { PageHeaderComponent } from './page-header/page-header.component';
import { AnswerBookCaptureComponent } from './answer-book-capture/answer-book-capture.component';
import { AnswerBookNavigationCardComponent } from './answer-book-navigation-card/answer-book-navigation-card.component';
import { AnswerBookStudentCardComponent } from './answer-book-student-card/answer-book-student-card.component';
import {AnswerBookPrintComponent} from "./answer-book-print/answer-book-print.component";
import { AnswerBookCommentsViewComponent } from './answer-book-comments-view/answer-book-comments-view.component';
import {ChartComponent} from "./chart/chart.component";
import { MarkingSummaryChartsComponent } from './marking-summary-charts/marking-summary-charts.component';
import { FilenamePipe } from './filename.pipe';
import { PdfTestBedComponent } from './pdf-test-bed/pdf-test-bed.component';

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
    AdminTasksComponent,
    TaskComponent,
    AnswerBookComponent,
    AnswerBooksComponent,
    AdminTaskComponent,
    AnswerPagePreviewComponent,
    PdfPageViewComponent,
    AnswerBookAnnotatorComponent,
    AnswerPageViewComponent,
    AnswerBookMarkingsViewComponent,
    AnswerPageAnnotationLayerComponent,
    PageWideComponent,
    PageFooterComponent,
    PageHeaderComponent,
    AnswerBookCaptureComponent,
    AnswerBookNavigationCardComponent,
    AnswerBookStudentCardComponent,
    AnswerBookPrintComponent,
    AnswerBookCommentsViewComponent,
    ChartComponent,
    MarkingSummaryChartsComponent,
    FilenamePipe,
    PdfTestBedComponent
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
