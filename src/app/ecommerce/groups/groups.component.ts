import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { IGroup } from '../ecommerce.interface';
import { GroupsService } from '../services/groups.service';
import { GenresService } from '../services/genres.service';

@Component({
  selector: 'app-groups',
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css'],
  providers: [ConfirmationService],
})
export class GroupsComponent implements OnInit {
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
  genresLoaded = false;
  selectedGenreId: number | null = null;
  
  constructor(
    private groupsService: GroupsService,
    private genresService: GenresService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.getGroups();
    this.loadGenres();
  }
  
  private loadGenres(): Promise<void> {
    this.genresLoaded = false; // Make sure to mark as not loaded on startup
    return new Promise((resolve, reject) => {
      this.genresService.getGenres().subscribe({
        next: (data: any) => {
          // Verify that data is an array
          const genresArray = Array.isArray(data) ? data : [];
          
          if (genresArray.length > 0) {
            this.genres = genresArray;
            this.genresLoaded = true;
            resolve();
          } else {
            const error = new Error('No genres found');
            console.error('Error: No genres found');
            this.visibleError = true;
            this.errorMessage = 'No genres found. Please try again later.';
            reject(error);
          }
        },
        error: (err) => {
          console.error('Error loading genres:', err);
          this.visibleError = true;
          this.errorMessage = 'Error loading genres. Please try again.';
          this.controlError(err);
          reject(err);
        },
      });
    });
  }

  getGroups() {
    this.groupsService.getGroups().subscribe({
      next: (groups: IGroup[]) => {
        this.visibleError = false;
        this.groups = groups;
        this.filteredGroups = [...this.groups];
      },
      error: (err) => {
        console.error('Error fetching groups:', err);
        this.visibleError = true;
        this.errorMessage = 'Failed to load groups. Please try again.';
      },
    });
  }

  filterGroups() {
    this.filteredGroups = this.groups.filter((group) =>
      group.nameGroup.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  onSearchChange() {
    this.filterGroups();
  }

  save() {
    if (this.group.idGroup === 0) {
      this.groupsService.addGroup(this.group).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.form.reset();
          this.getGroups();
        },
        error: (err) => {
          console.log(err);
          this.visibleError = true;
          this.controlError(err);
        },
      });
    } else {
      this.groupsService.updateGroup(this.group).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.cancelEdition();
          this.form.reset();
          this.getGroups();
        },
        error: (err) => {
          this.visibleError = true;
          this.controlError(err);
        },
      });
    }
  }

  async edit(group: IGroup) {
    // Force reload of genres every time you edit
    try {
      await this.loadGenres();
    } catch (error) {
      console.error('Error loading genres:', error);
      return;
    }
    
    // Verify that we have genres before continuing
    if (this.genres.length === 0) {
      console.error('No genres available');
      this.visibleError = true;
      this.errorMessage = 'Genres cannot be loaded. Please try again.';
      return;
    }
    
    // Verify that the genre of the group exists in the list of genres
    const genreFound = this.genres.some(g => g.idMusicGenre === group.musicGenreId);
    
    // If the genre does not exist, use the first genre available
    if (!genreFound && this.genres.length > 0) {
      this.selectedGenreId = this.genres[0].idMusicGenre;
      this.group.musicGenreId = this.genres[0].idMusicGenre;
      this.group.musicGenre = this.genres[0].nameMusicGenre;
    } else {
      this.selectedGenreId = group.musicGenreId || null;
    }

    // Make a deep copy of the group
    this.group = { 
      ...group,
      photo: null,
      photoName: group.imageGroup ? this.extractNameImage(group.imageGroup) : ''
    };
    
    // Search for the genre by ID if available
    if (this.group.musicGenreId) {
      const genre = this.genres.find(g => g.idMusicGenre === this.group.musicGenreId);
      if (genre) {
        this.group.musicGenre = genre.nameMusicGenre;
        this.group.musicGenreId = genre.idMusicGenre;
      }
    } 
    // If there is no ID but there is a genre name, search by name
    else if (this.group.musicGenre) {
      const selectedGenre = this.genres.find(g => 
        g.nameMusicGenre.toLowerCase() === this.group.musicGenre?.toLowerCase()
      );
      
      if (selectedGenre) {
        this.group.musicGenreId = selectedGenre.idMusicGenre;
        this.group.musicGenre = selectedGenre.nameMusicGenre;
      }
    }
  }

  extractNameImage(url: string): string {
    return url.split('/').pop() || '';
  }

  cancelEdition() {
    this.group = {
      idGroup: 0,
      nameGroup: '',
      imageGroup: null,
      photo: null,
      musicGenreId: 0,
      musicGenreName: '',
      musicGenre: '',
    };
  }

  confirmDelete(group: IGroup) {
    this.confirmationService.confirm({
      message: `Delete the group ${group.nameGroup}?`,
      header: 'Are you sure?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteGroup(group.idGroup!),
    });
  }

  deleteGroup(id: number) {
    this.groupsService.deleteGroup(id).subscribe({
      next: (data) => {
        this.visibleError = false;
        this.form.reset({
          nameMusicGenre: '',
        });
        this.getGroups();
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

  onChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.group.photo = file;
      this.group.photoName = file.name;
    }
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

  // Comparator for the genre select
  compareGenres(genre1: any, genre2: any): boolean {
    return genre1 && genre2 ? genre1.idMusicGenre === genre2.idMusicGenre : genre1 === genre2;
  }

  onGenreChange(genreId: number | null) {
    this.selectedGenreId = genreId;
    if (genreId) {
      const selectedGenre = this.genres.find(g => g.idMusicGenre === genreId);
      if (selectedGenre) {
        this.group.musicGenre = selectedGenre.nameMusicGenre;
        this.group.musicGenreId = selectedGenre.idMusicGenre;
      }
    } else {
      this.group.musicGenre = '';
      this.group.musicGenreId = 0;
    }
  }
}
