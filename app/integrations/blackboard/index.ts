import qs from "qs";

import {
  AccessTokenType,
  CourseResponse,
  TermCoursesResponse,
  TermsResponse,
  GradebookColumnsResponse,
  GradebookColumnUserUpdateResponse,
  GradebookColumnUserResponse
} from '@/app/models/blackboard';

class Blackboard {
  private static instance: Blackboard;
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken!: string;

  private constructor() {
    this.baseUrl = process.env.BB_HOST!;
    this.clientId = process.env.BB_CLIENT_ID!;
    this.clientSecret = process.env.BB_CLIENT_SECRET!;
  }

  public static getInstance(): Blackboard {
    if (!Blackboard.instance) {
      Blackboard.instance = new Blackboard();
    }
    return Blackboard.instance;
  }

  public async init(): Promise<void> {
    try {
      const { access_token } = await this.getAccessToken();
      this.accessToken = access_token;
      if (!this.accessToken) {
        throw new Error('Error getting access token');
      }
    } catch (error) {
      console.error('Error initializing Blackboard instance:', error);
    }
  }

  private async getAccessToken(): Promise<AccessTokenType> {
    const url = `https://${this.baseUrl}/learn/api/public/v1/oauth2/token`;
    const data = {
      grant_type: 'client_credentials',
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: qs.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch access token: ${response.statusText}`);
    }
    return response.json();
  }

  private async fetchFromBlackboard(url: string, method: string = 'GET', body?: any): Promise<any> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.json();
  }

  public async getCourse(courseId: string, params?: { fields: string }): Promise<CourseResponse> {
    const queryString = params ? `?${qs.stringify(params)}` : ''
    const url = `https://${this.baseUrl}/learn/api/public/v3/courses/${courseId}${queryString}`;
    return this.fetchFromBlackboard(url);
  }

  public async deleteCourse(courseId: string): Promise<any> {
    const url = `https://${this.baseUrl}/learn/api/public/v1/courses/${courseId}`;
    return this.fetchFromBlackboard(url, 'DELETE');
  }

  public async updateCourse(id: string, data: any): Promise<any> {
    const url = `https://${this.baseUrl}/learn/api/public/v1/courses/${id}`;
    return this.fetchFromBlackboard(url, 'PATCH', data);
  }

  public async getCourses(params: {
    offset?: number;
    limit?: number;
    modified?: string;
    modifiedCompare?: 'lessThan' | 'greaterOrEqual';
    courseId?: string;
    name?: string;
    description?: string;
    externalId?: string;
    created?: string;
    createdCompare?: 'lessThan' | 'greaterOrEqual';
    allowGuests?: boolean;
    availability?: 'Yes' | 'No' | 'Disabled' | 'Term';
    dataSourceId?: string;
    termId?: string;
    organization?: boolean;
    sort?: string;
    fields?: string;
  }): Promise<TermCoursesResponse> {
    const queryString = params ? `?${qs.stringify(params)}` : ''
    const url = `https://${this.baseUrl}/learn/api/public/v3/courses${queryString}`;
    let result: TermCoursesResponse = await this.fetchFromBlackboard(url);
  
    while (result.paging?.nextPage) {
      const nextPageUrl = `https://${this.baseUrl}${result.paging.nextPage}`;
      const nextPageResult: TermCoursesResponse = await this.fetchFromBlackboard(nextPageUrl);
      result.results = result.results.concat(nextPageResult.results);
      result.paging.nextPage = nextPageResult.paging?.nextPage ? nextPageResult.paging.nextPage : '';
    }
  
    return result;
  }

  public async getTerms(params: { 
    offset?: number; 
    limit?: number; 
    externalId?: string; 
    dataSourceId?: string; 
    availability?: 'Yes' | 'No';
    fields?: string
  }): Promise<TermsResponse> {
    const queryString = params ? `?${qs.stringify(params)}` : ''
    const url = `https://${this.baseUrl}/learn/api/public/v1/terms${queryString}`;
    let result = await this.fetchFromBlackboard(url);
    while (result.paging?.nextPage) {
      const nextPageUrl = `https://${this.baseUrl}${result.paging.nextPage}`;
      const nextPageResult = await this.fetchFromBlackboard(nextPageUrl);
      result.results = result.results.concat(nextPageResult.results);
    }
    return result;
  }

  public async getCourseGradeColumns(params: {
    courseId: string;
    offset?: number;
    limit?: number;
    contentId?: string;
    displayName?: string;
    name?: string;
    gradebookCategoryId?: string[];
    created?: string;
    createdCompare?: 'lessThan' | 'greaterOrEqual';
    modified?: string;
    modifiedCompare?: 'lessThan' | 'greaterOrEqual';
    fields?: string;
    expand?: string;
  }): Promise<GradebookColumnsResponse | null> {
    const { courseId, ...otherParams } = params;
    const queryString = qs.stringify(otherParams);
  
    let url = `https://${this.baseUrl}/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns?${queryString}`;
    if (params.fields) {
      url += `&fields=${params.fields}`;
    }
    if (params.expand) {
      url += `&expand=${params.expand}`;
    }
  
    let result: GradebookColumnsResponse = await this.fetchFromBlackboard(url);
  
    while (result.paging?.nextPage) {
      const nextPageUrl = `https://${this.baseUrl}${result.paging.nextPage}`;
      const nextPageResult: GradebookColumnsResponse = await this.fetchFromBlackboard(nextPageUrl);
      result.results = result.results.concat(nextPageResult.results);
    }
  
    return result.results.length > 0 ? result : null;
  }

  public async getCourseId(courseCode: string): Promise<string | void> {
    try {
      const data = await this.getCourses({ courseId: courseCode });
      const { results } = data;
      return results[0].id;
    } catch (error) {
      console.error('Error getting course ID:', error);
      return
    }
  }

  public async getGradeColumnId(courseId: string, name: string): Promise<string | void> {
    try {
      const data = await this.getCourseGradeColumns({ courseId, name });
      if (!data) {
        throw new Error("No grade columns found");
      }
      const { results } = data;
      return results[0].id;
    } catch (error) {
      console.error('Error getting overall grade column:', error);
      return
    }
  }
  
  public async getGradeColumnUsers(courseId: string, columnId: string, params: {
    offset?: number;  // The number of rows to skip before beginning to return rows
    limit?: number;  // The maximum number of results to be returned
    changeIndex?: number;  // Retrieve only items modified after the given change index
    includeUnpostedGrades?: boolean;  // If true, include unposted grades in calculated columns
    includeDisabledMemberships?: boolean;  // If true, include users with disabled access
    firstRelevantDate?: string;  // The first relevant date for search criteria
    firstRelevantDateCompare?: 'lessThan' | 'greaterOrEqual';  // Compare value for firstRelevantDate
    lastRelevantDate?: string;  // The last relevant date for search criteria
    lastRelevantDateCompare?: 'lessThan' | 'greaterOrEqual';  // Compare value for lastRelevantDate
    fields?: string;  // A comma-delimited list of fields to include in the response
} | null = null): Promise<GradebookColumnUserResponse | void> {
    const queryString = params ? `?${qs.stringify(params)}` : ''
    const url = `https://${this.baseUrl}/learn/api/public/v2/courses/${courseId}/gradebook/columns/${columnId}/users${queryString}`;
    let result = await this.fetchFromBlackboard(url);
    while (result.paging?.nextPage) {
      const nextPageUrl = `https://${this.baseUrl}${result.paging.nextPage}`;
      const nextPageResult = await this.fetchFromBlackboard(nextPageUrl);
      result.results = result.results.concat(nextPageResult.results);
    }
    return result;
  }

  
  public async patchGradeColumnUsers(
    courseId: string,
    columnId: string,
    userId: string,
    input: {  // The input object for grade details
        text: string;
        score: number;
        notes: string;
        feedback: string;
        exempt: boolean;
        gradeNotationId: string;
    },
    params: { fields?: string } = {}
  ): Promise<GradebookColumnUserUpdateResponse | void> {
    const queryString = params ? `?${qs.stringify(params)}` : ''
    const url =`https://${this.baseUrl}/learn/api/public/v2/courses/${courseId}/gradebook/columns/${columnId}/users/${userId}`
    return this.fetchFromBlackboard(url, 'PATCH', input);
  }
}

export default Blackboard;