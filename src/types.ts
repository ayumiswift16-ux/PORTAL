export type EnrollmentType = 'Regular' | 'Irregular' | 'Returnee';

export type YearLevel = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export type Course = 'BSIT' | 'BSCPE' | 'BEEd GEN' | 'BSBA HRM' | 'BS ENTREP' | 'BECEd' | 'BECEd SCI' | 'BTLED-ICT' | 'TCP';

export interface StudentInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  age: string;
  gender: string;
  address: string;
  contactNumber: string;
  email: string;
  birthday: string;
  studentId: string;
  yearLevel: YearLevel;
}

export interface EnrollmentData {
  studentInfo: StudentInfo;
  type: EnrollmentType;
  course: Course;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Enrolled';
  enrolledAt: string;
}

export interface User {
  username: string;
  name: string;
  role: 'admin';
}

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Section {
  name: string;
  yearLevel: YearLevel;
}

export interface ScheduleItem {
  id: string;
  section: string;
  subject: string;
  day: Day;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  instructor: string;
  room: string;
}
