import { Edit, GraduationCap, LayoutDashboard, LogOut, Settings, Users, BookOpen, Calendar } from 'lucide-react';

export const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'student'] },
  { icon: GraduationCap, label: 'Enrollment', path: '/enroll', roles: ['admin', 'student'] },
  { icon: Calendar, label: 'Class Schedule', path: '/scheduling', roles: ['admin', 'student'] },
  { icon: Edit, label: 'Enrollment Steps', path: '/steps', roles: ['student'] },
  { icon: BookOpen, label: 'Courses', path: '/courses', roles: ['student'] },
  { icon: Users, label: 'Student Records', path: '/records', roles: ['admin'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['admin'] },
];
