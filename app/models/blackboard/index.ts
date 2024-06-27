// Access Token Type
export type AccessTokenType = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

// Common Paging Type
export type Paging = {
  nextPage: string;
};

// Course Response Type
export type CourseResponse = {
  id: string;
  uuid: string;
  externalId: string;
  dataSourceId: string;
  courseId: string;
  name: string;
  description: string;
  created: string; // ISO 8601 date-time string
  modified: string; // ISO 8601 date-time string
  organization: boolean;
  ultraStatus: string;
  allowGuests: boolean;
  allowObservers: boolean;
  closedComplete: boolean;
  termId: string;
  availability: {
    available: string;
    duration: {
      type: string;
      start: string; // ISO 8601 date-time string
      end: string; // ISO 8601 date-time string
      daysOfUse: number;
    };
  };
  enrollment: {
    type: string;
    start: string; // ISO 8601 date-time string
    end: string; // ISO 8601 date-time string
    accessCode: string;
  };
  locale: {
    id: string;
    force: boolean;
  };
  hasChildren: boolean;
  parentId: string;
  externalAccessUrl: string;
  guestAccessUrl: string;
  copyHistory: Array<{
    uuid: string;
  }>;
};

// Unified Term Courses Response Type
export type TermCoursesResponse = {
  results: Array<CourseResponse>;
  paging?: Paging;
};

// Terms Response Type
export type TermsResponse = {
  results: Array<{
    id: string;
    name: string;
    description: string;
    availability: {
      available: string;
      duration: {
        type: string;
        start: string;
        end: string;
        daysOfUse: number;
      };
    };
    externalId?: string;
    dataSourceId?: string;
  }>;
  paging?: Paging;
};

// Gradebook Column Type
export type GradebookColumn = {
  id: string;
  name: string;
  schemaId?: string;
  anonymousGrading?: {
    type: string;
    releaseAfter?: string;
  };
  rubricAssociations?: Array<{
    id: string;
    rubricId: string;
    associationEntity: {
      gradebookColumnId: string;
      questionId: string;
    };
    usedForGrading: boolean;
    rubricVisibility: string;
    links: Array<{
      href: string;
      rel: string;
      title: string;
      type: string;
    }>;
  }>;
  gradebookCategoryId?: string;
  formula?: {
    formula: string;
    aliases: { [key: string]: string };
  };
  includeInCalculations?: boolean;
  showStatisticsToStudents?: boolean;
  scoreProviderHandle?: string;
};

// Gradebook Columns Response Type
export type GradebookColumnsResponse = {
  results: Array<GradebookColumn>;
  paging?: Paging;
};

export type GradebookColumnUser = {
  userId: string;
  columnId: string;
  status: string;  // e.g., "Graded"
  displayGrade: {
    scaleType: string;  // e.g., "Percent"
    score: number;
    possible: number;
    text: string;
  };
  text: string;
  score: number;
  overridden: string;  // Date string
  notes: string;
  feedback: string;
  exempt: boolean;
  corrupt: boolean;
  gradeNotationId: string;
  changeIndex: number;
  firstRelevantDate: string;  // Date string
  lastRelevantDate: string;  // Date string
};

export type GradebookColumnUserResponse = {
  results: Array<GradebookColumnUser>;
  paging?: Paging;
};

export interface GradeColumnRows {
  "userId": string,
  "columnId": string,
  "status": string,
  "displayGrade": {
    "scaleType": string,
    "score": number,
    "possible": number,
    "text": string
  },
  "text": string,
  "score": number,
  "overridden": string,
  "exempt": boolean,
  "changeIndex": number,
  "firstRelevantDate": string,
  "lastRelevantDate": string,
}

export type GradebookColumnUserUpdateResponse = {
  userId: string;
  columnId: string;
  status: string;  // e.g., "Graded"
  displayGrade: {
    scaleType: string;  // e.g., "Percent"
    score: number;
    possible: number;
    text: string;
  };
  text: string;
  score: number;
  overridden: string;  // Date string
  notes: string;
  feedback: string;
  exempt: boolean;
  corrupt: boolean;
  gradeNotationId: string;
  changeIndex: number;
  firstRelevantDate: string;  // Date string
  lastRelevantDate: string;  // Date string
}

export interface UserResponse {
  id: string;
  uuid: string;
  externalId: string;
  dataSourceId: string;
  userName: string;
  studentId: string;
  educationLevel: string; // 'K8' in example, can be other values
  gender: string; // 'Female' in example, can be other values
  pronouns: string;
  birthDate: string; // ISO 8601 format date string
  created: string; // ISO 8601 format date string
  modified: string; // ISO 8601 format date string
  lastLogin: string; // ISO 8601 format date string
  institutionRoleIds: string[];
  systemRoleIds: string[]; // e.g., 'SystemAdmin'
  availability: {
    available: string; // 'Yes' in example, can be other values
  };
  name: {
    given: string;
    family: string;
    middle: string;
    other: string;
    suffix: string;
    title: string;
    preferredDisplayName: string; // e.g., 'GivenName'
  };
  job: {
    title: string;
    department: string;
    company: string;
  };
  contact: {
    homePhone: string;
    mobilePhone: string;
    businessPhone: string;
    businessFax: string;
    email: string;
    institutionEmail: string;
    webPage: string;
  };
  address: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  locale: {
    id: string;
    calendar: string; // e.g., 'Gregorian'
    firstDayOfWeek: string; // e.g., 'Sunday'
  };
  avatar: {
    viewUrl: string;
    source: string; // e.g., 'Default'
    uploadId: string;
    resourceId: string;
  };
  pronunciation: string;
  nodes: {
    id: string;
    externalId: string;
    title: string;
    description: string;
    parentId: string;
  }[];
  pronunciationAudio: {
    viewUrl: string;
    uploadId: string;
  };
}