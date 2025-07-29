import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from "@angular/core";
import { ConfirmationService } from "primeng/api";
import { NgForm } from "@angular/forms";
import { IRecord } from "../ecommerce.interface";
import { RecordsService } from "../services/records.service";
import { GroupsService } from "../services/groups.service";
import { StockService } from "../services/stock.service";
import { CartService } from "../services/cart.service";
import { Subject, takeUntil } from "rxjs";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-records",
  templateUrl: "./records.component.html",
  styleUrls: ["./records.component.css"],
  providers: [ConfirmationService],
})
export class RecordsComponent implements OnInit, OnDestroy {
  @ViewChild("form") form!: NgForm;
  @ViewChild("fileInput") fileInput!: ElementRef;
  visibleError = false;
  errorMessage = "";
  records: IRecord[] = [];
  filteredRecords: IRecord[] = [];
  visibleConfirm = false;
  imageRecord = "";
  visiblePhoto = false;
  photo = "";
  searchText: string = "";

  record: IRecord = {
    idRecord: 0,
    titleRecord: "",
    yearOfPublication: null,
    imageRecord: null,
    photo: null,
    photoName: null,
    price: 0,
    stock: 0,
    discontinued: false,
    groupId: null,
    groupName: "",
    nameGroup: "",
  };

  groups: any[] = [];
  recordService: any;
  private destroy$ = new Subject<void>();

  constructor(
    private recordsService: RecordsService,
    private groupsService: GroupsService,
    private confirmationService: ConfirmationService,
    private stockService: StockService,
    private cartService: CartService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.getRecords();
    this.getGroups();

    // Subscribe to stock updates
    this.stockService.stockUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ recordId, newStock }) => {
        const record = this.records.find((r) => r.idRecord === recordId);
        if (record) {
          record.stock = newStock;
          // Update filtered records as well
          const filteredRecord = this.filteredRecords.find(
            (r) => r.idRecord === recordId
          );
          if (filteredRecord) {
            filteredRecord.stock = newStock;
          }
        }
      });

    // Subscribe to cart updates
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe((cartItems) => {
        this.records.forEach((record) => {
          const cartItem = cartItems.find(
            (item) => item.idRecord === record.idRecord
          );
          record.inCart = !!cartItem;
          record.amount = cartItem ? cartItem.amount || 0 : 0;
        });
        this.filteredRecords = [...this.records];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getRecords() {
    this.recordsService.getRecords().subscribe({
      next: (records: IRecord[]) => {
        // The service now returns a clean array of records
        this.records = records;
        this.filteredRecords = [...this.records];
        
        // Get groups to assign names
        this.groupsService.getGroups().subscribe({
          next: (groups: any[]) => {
            // Assign group names to each record
            this.records.forEach(record => {
              const group = groups.find(g => g.idGroup === record.groupId);
              if (group) {
                record.groupName = group.nameGroup;
              }
            });
            this.filteredRecords = [...this.records];
          },
          error: (err) => {
            console.error("Error getting groups:", err);
            // Still show records even if group names couldn't be loaded
            this.filteredRecords = [...this.records];
          }
        });
      },
      error: (err) => {
        console.error("Error getting records:", err);
        this.visibleError = true;
        this.controlError(err);
      }
    });
  }

  filterRecords() {
    if (!this.searchText?.trim()) {
      this.filteredRecords = [...this.records];
      return;
    }

    const searchTerm = this.searchText.toLowerCase();
    this.filteredRecords = this.records.filter((record) => {
      return (
        record.titleRecord?.toLowerCase().includes(searchTerm) ||
        record.groupName?.toLowerCase().includes(searchTerm) ||
        record.yearOfPublication?.toString().includes(searchTerm)
      );
    });
  }

  onSearchChange() {
    this.filterRecords();
  }

  getGroups() {
    this.groupsService.getGroups().subscribe({
      next: (response: any) => {
        // Flexible handling of different response structures
        let groupsArray = [];

        if (Array.isArray(response)) {
          // The answer is a direct array
          groupsArray = response;
        } else if (Array.isArray(response.$values)) {
          // The response has property $values
          groupsArray = response.$values;
        } else if (Array.isArray(response.data)) {
          // The response has data property
          groupsArray = response.data;
        } else {
          console.warn("Unexpected API response structure:", response);
        }

        this.groups = groupsArray;
      },
      error: (err) => {
        console.error("Error loading groups:", err);
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  onChange(event: any) {
    const file = event.target.files;

    if (file && file.length > 0) {
      this.record.photo = file[0];
      this.record.photoName = file[0].name;
    }
  }

  onAceptar() {
    this.fileInput.nativeElement.value = "";
  }

  showImage(record: IRecord) {
    if (this.visiblePhoto && this.record === record) {
      this.visiblePhoto = false;
    } else {
      this.record = record;
      this.photo = record.imageRecord!;
      this.visiblePhoto = true;
    }
  }

  save() {
    if (this.record.idRecord === 0) {
      this.recordsService.addRecord(this.record).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.form.reset();
          this.getRecords();
        },
        error: (err) => {
          console.log(err);
          this.visibleError = true;
          this.controlError(err);
        },
      });
    } else {
      this.recordsService.updateRecord(this.record).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.cancelEdition();
          this.form.reset();
          this.getRecords();
        },
        error: (err) => {
          this.visibleError = true;
          this.controlError(err);
        },
      });
    }
  }

  confirmDelete(record: IRecord) {
    this.confirmationService.confirm({
      message: `Delete record ${record.titleRecord}?`,
      header: "Are you sure?",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Yes",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => this.deleteRecord(record.idRecord),
    });
  }

  deleteRecord(id: number) {
    this.recordsService.deleteRecord(id).subscribe({
      next: (data: IRecord) => {
        this.visibleError = false;
        this.getRecords();
      },
      error: (err: any) => {
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  edit(record: IRecord) {
    this.record = { ...record };
    if (this.record.stock === null || this.record.stock === undefined) {
      this.record.stock = 1;
    }
    this.record.photoName = record.imageRecord
      ? this.extractImageName(record.imageRecord)
      : "";
    // If there is an associated group, make sure the select reflects it
    if (record.groupId) {
      const selectedGroup = this.groups.find(
        (g) => g.idGroup === record.groupId
      );
      if (selectedGroup) {
        this.record.groupName = selectedGroup.nameGroup;
      }
    }
  }

  extractImageName(url: string): string {
    return url.split("/").pop() || "";
  }

  cancelEdition() {
    this.record = {
      idRecord: 0,
      titleRecord: "",
      yearOfPublication: null,
      imageRecord: null,
      photo: null,
      photoName: null,
      price: 0,
      stock: 0,
      discontinued: false,
      groupId: null,
      groupName: "",
      nameGroup: "",
    };
  }

  controlError(err: any) {
    if (err.error && typeof err.error === "object" && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === "string") {
      this.errorMessage = err.error;
    } else {
      this.errorMessage = "An unexpected error has occurred";
    }
  }

  addToCart(record: IRecord): void {
    const userEmail = this.userService.email;
    if (!userEmail) return;

    this.cartService.addToCart(record).subscribe(
      (response) => {
        // Update UI locally
        record.inCart = true;
        record.amount = (record.amount || 0) + 1;
        this.filteredRecords = [...this.records];
      },
      (error) => {
        console.error("Error adding to cart:", error);
        // Revert local changes if it fails
        record.inCart = false;
        record.amount = 0;
        this.filteredRecords = [...this.records];
      }
    );
  }

  removeFromCart(record: IRecord): void {
    const userEmail = this.userService.email;
    if (!userEmail || !record.inCart) return;

    this.cartService.removeFromCart(record).subscribe(
      (response) => {
        // Update UI locally
        record.amount = Math.max(0, (record.amount || 0) - 1);
        record.inCart = record.amount > 0;
        this.filteredRecords = [...this.records];
      },
      (error) => {
        console.error("Error removing from cart:", error);
        // Revert local changes if it fails
        record.amount = (record.amount || 0) + 1;
        record.inCart = true;
        this.filteredRecords = [...this.records];
      }
    );
  }
}
