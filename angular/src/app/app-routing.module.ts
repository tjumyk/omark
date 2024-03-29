import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {NotFoundComponent} from "./not-found/not-found.component";
import {ForbiddenComponent} from "./forbidden/forbidden.component";
import {AdminGuard} from "./admin.guard";
import {PageComponent} from "./page/page.component";
import {HomeComponent} from "./home/home.component";
import {AdminComponent} from "./admin/admin.component";
import {AdminTasksComponent} from "./admin-tasks/admin-tasks.component";
import {TaskComponent} from "./task/task.component";
import {AnswerBooksComponent} from "./answer-books/answer-books.component";
import {AnswerBookComponent} from "./answer-book/answer-book.component";
import {AdminTaskComponent} from "./admin-task/admin-task.component";
import {PageWideComponent} from "./page-wide/page-wide.component";
import {PdfTestBedComponent} from "./pdf-test-bed/pdf-test-bed.component";


const routes: Routes = [
  {path: '', pathMatch: 'full', component: HomeComponent},
  {
    path: '',
    component: PageComponent,
    children: [
      {
        path: 'admin',
        canActivate: [AdminGuard],
        component: AdminComponent,
        children: [
          {path: '', pathMatch: 'full', redirectTo: '/admin/tasks'},
          {path: 'tasks', component: AdminTasksComponent},
          {path: 'tasks/:task_id', component: AdminTaskComponent}
        ]
      },
    ]
  },
  {
    path: '',
    component: PageWideComponent,
    children:[
      {
        path: 'tasks/:task_id',
        component: TaskComponent,
        children: [
          {path: '', pathMatch: 'full', redirectTo: 'books'},
          {path: 'books', component: AnswerBooksComponent},
          {path: 'books/:book_id', component: AnswerBookComponent},
          {path: 'pdf-test-bed', component: PdfTestBedComponent}
        ]
      }
    ]
  },
  {path: 'forbidden', component: ForbiddenComponent},
  {path: '**', component: NotFoundComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
