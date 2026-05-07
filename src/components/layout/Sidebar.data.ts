import { Edit, GraduationCap, LayoutDashboard, LogOut, Settings, Users, BookOpen } from 'lucide-react';

export const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: GraduationCap, label: 'Enroll Student', path: '/enroll' },
  { icon: Users, label: 'Student Records', path: '/records' },
  { icon: Edit, label: 'Enrollment Steps', path: '/steps' },
  { icon: BookOpen, label: 'Courses', path: '/courses' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];
