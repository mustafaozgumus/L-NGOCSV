export interface Word {
  id: string;
  english: string;
  turkish: string;
  part: string;
  isHard?: boolean;
}

export interface PartData {
  name: string;
  words: Word[];
}

export enum AppView {
  HOME = 'HOME',
  STUDY = 'STUDY',
  DIFFICULT = 'DIFFICULT'
}

export interface CSVRow {
  [key: string]: string;
}