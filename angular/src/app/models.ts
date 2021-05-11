export class BasicError {
  msg: string;
  detail?: string;
  redirect_url?: string;
}

export class User {
  id: number;
  name: string;
  email: string;
  nickname: string;
  avatar: string;

  groups: Group[];
}

export class Group {
  id: number;
  name: string;
  description: string;
}

export class Task {
  id: number;
  name: string;
  config_locked: boolean;
  answer_locked: boolean;
  marking_locked: boolean;

  created_at: string;
  modified_at: string;

  questions?: Question[];
  materials?: Material[];
}

export class Material{
  id: number;
  task_id: number;
  name: string;
  created_at: string;
  modified_at: string;

  task?: Task;
}

export class Question {
  id: number;
  task_id: number;

  index: number;
  label?: string;
  marks: number;
  description?: string;
  excluded_from_total: boolean;

  created_at: string;
  modified_at: string;

  marker_assignments?: MarkerQuestionAssignment[];

  task?: Task;
}

export class MarkerQuestionAssignment {
  marker_id: number;
  question_id: number;

  created_at: string;
  modified_at: string;

  marker?: User;
  question?: Question;
}

export class AnswerBook {
  id: number;
  task_id: number;

  student_id?: number;

  creator_id?: number;
  modifier_id?: number;
  created_at: string;
  modified_at: string;
  submitted_at: string;

  task?: Task;
  student?: User;
  creator?: User;
  modifier?: User;

  pages?: AnswerPage[];
  markings?: Marking[];
  comments?: Comment[];
}

export class AnswerPage {
  id: number;
  book_id: number;

  index: number;
  file_path: string;
  file_index?: number;
  transform: string;

  creator_id?: number;
  modifier_id?: number;
  created_at: string;
  modified_at: string;

  book?: AnswerBook;
  creator?: User;
  modifier?: User;

  annotations?: Annotation[];
}

export class Marking {
  id: number;
  book_id: number;
  question_id: number;

  marks: number;
  remarks: string;

  creator_id?: number;
  modifier_id?: number;
  created_at: string;
  modified_at: string;

  book?: AnswerBook;
  question?: Question;
  creator?: User;
  modifier?: User;
}

export class Annotation {
  id: number;
  page_id: number;

  data?: string;

  creator_id?: number;
  created_at: string;
  modified_at: string;

  page?: AnswerPage;
  creator?: User;
}

export class VersionInfo {
  version: string;
}

export class Comment {
  id: number;
  book_id: number;

  content: string;

  creator_id: number;
  created_at: string;
  modified_at: string;

  book?: AnswerBook;
  creator?: User;
}
