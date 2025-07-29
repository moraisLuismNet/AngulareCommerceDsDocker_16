import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { IGroup } from '../ecommerce.interface';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { GenresService } from '../services/genres.service';

@Component({
  selector: 'app-listgroups',
  templateUrl: './listgroups.component.html',
  styleUrls: ['./listgroups.component.css'],
  providers: [ConfirmationService],
})
export class ListgroupsComponent implements OnInit {
  @ViewChild(NavbarComponent, { static: false }) navbar!: NavbarComponent;
  @ViewChild('form') form!: NgForm;
  @ViewChild('fileInput') fileInput!: ElementRef;
  visibleError = false;
  errorMessage = '';
  groups: IGroup[] = [];
  filteredGroups: IGroup[] = [];
  visibleConfirm = false;
  imageGroup = '';
  visiblePhoto = false;
  photo = '';
  searchText: string = '';

  group: IGroup = {
    idGroup: 0,
    nameGroup: '',
    imageGroup: null,
    photo: null,
    musicGenreId: 0,
    musicGenreName: '',
    musicGenre: '',
  };

  genres: any[] = [];
  records: any[] = [];

  constructor(
    private groupsService: GroupsService,
    private genresService: GenresService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getGroups();
    this.getGenres();
  }

  getGroups() {
    this.groupsService.getGroups().subscribe({
      next: (data) => {
        this.visibleError = false;

        // We check if data has a $values ​​property
        this.groups = (data as any).$values ? (data as any).$values : data;

        this.filterGroups();
      },
      error: (err) => {
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  getGenres() {
    this.genresService.getGenres().subscribe({
      next: (data) => {
        this.genres = data;
      },
      error: (err) => {
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  controlError(err: any) {
    if (err.error && typeof err.error === 'object' && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === 'string') {
      this.errorMessage = err.error;
    } else {
      this.errorMessage = 'An unexpected error has occurred';
    }
  }

  filterGroups() {
    if (!Array.isArray(this.groups)) {
      this.groups = [];
    }
    this.filteredGroups = this.groups.filter((group) =>
      group.nameGroup.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  onSearchChange() {
    this.filterGroups();
  }

  showImage(group: IGroup) {
    if (this.visiblePhoto && this.group === group) {
      this.visiblePhoto = false;
    } else {
      this.group = group;
      this.photo = group.imageGroup!;
      this.visiblePhoto = true;
    }
  }

  loadRecords(idGroup: string): void {
    this.router.navigate(['/listrecords', idGroup]);
  }
}
