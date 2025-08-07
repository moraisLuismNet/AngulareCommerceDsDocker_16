import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { Router, NavigationEnd } from '@angular/router';
import { CartService } from 'src/app/ecommerce/services/cart.service';
import { of, Subject } from 'rxjs';
import { takeUntil, filter, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  emailUser: string | null = null;
  role: string | null = null;
  cartItemsCount: number = 0;
  cartTotal: number = 0;
  currentRoute: string = '';
  private readonly destroy$ = new Subject<void>();
  cartEnabled: boolean = true;

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly cartService: CartService,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    // Initialize the current route
    this.currentRoute = this.router.url;
  }

  ngOnInit(): void {
    // Subscription to user email
    this.userService.emailUser$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((email) => {
          this.emailUser = email;
          if (email) {
            // Check cart status and then sync
            return this.cartService.getCartStatus(email).pipe(
              tap((status: { enabled: boolean }) => {
                this.cartEnabled = status.enabled;
                if (status.enabled) {
                  this.cartService.syncCartWithBackend(email);
                } else {
                  this.cartService.resetCart();
                }
              })
            );
          } else {
            this.cartItemsCount = 0;
            this.cartTotal = 0;
            return of(null);
          }
        })
      )
      .subscribe();

    // Subscription to user role
    this.userService.role$.pipe(takeUntil(this.destroy$)).subscribe((role) => {
      this.role = role;
    });

    // Subscription to cart item count
    this.cartService.cartItemCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.cartItemsCount = count;
          // Force change detection
          setTimeout(() => {
            this.changeDetector.detectChanges();
          });
        },
        error: (err) => console.error('Error en cartItemCount$:', err)
      });

    // Subscription to cart total
    this.cartService.cartTotal$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (total) => {
          this.cartTotal = total;
          // Force change detection
          setTimeout(() => {
            this.changeDetector.detectChanges();
          });
        },
        error: (err) => console.error('Error in cartTotal$:', err)
      });

    // Subscription to router events
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.currentRoute = event.url;
      });
  }

  isAdmin(): boolean {
    return this.role === 'Admin';
  }

  isListGroupsPage(): boolean {
    return this.currentRoute.includes('/listgroups') || this.currentRoute === '/';
  }

  isOrdersPage(): boolean {
    const isOrdersPage = this.currentRoute.includes('/ecommerce/admin-orders') || this.currentRoute.includes('/orders');
    return isOrdersPage;
  }

  isGenresPage(): boolean {
    return this.currentRoute.includes('/ecommerce/genres') || this.currentRoute === '/genres';
  }

  isGroupsPage(): boolean {
    return this.currentRoute.includes('/ecommerce/groups') || this.currentRoute === '/groups';
  }

  isRecordsPage(): boolean {
    return this.currentRoute.includes('/ecommerce/records') || this.currentRoute === '/records';
  }

  isCartsPage(): boolean {
    return this.currentRoute.includes('/ecommerce/carts') || this.currentRoute === '/carts';
  }

  isUsersPage(): boolean {
    return this.currentRoute.includes('/ecommerce/users') || this.currentRoute === '/users';
  }

  logout(): void {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('role');
    this.userService.clearUser();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isLoginPage(): boolean {
    return this.currentRoute.includes('/login');
  }
}
