import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {AccountService} from "./account.service";
import {catchError, map} from "rxjs/operators";
import {of} from "rxjs/internal/observable/of";
import {User} from "./models";

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private accountService: AccountService,
    private router: Router
  ) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.accountService.getCurrentUser().pipe(
      map((user: User) => {
        if (user != null) {
          for (let group of user.groups) {
            if (group.name == 'admin') {
              return true;
            }
          }
        }
        this.router.navigate(['/forbidden']);
        return false;
      }),
      catchError((error) => {
        const redirect_url = error.error.redirect_url;
        if (redirect_url) {
          window.location.href = redirect_url;
        } else {
          this.router.navigate(['/forbidden']);
        }
        return of(false);
      })
    )
  }
}
