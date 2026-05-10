import { Course, YearLevel } from './types';

export const COURSES: { id: Course; title: string; description: string; duration: string; slots: number }[] = [
  {
    id: 'BSIT',
    title: 'BS in Information Technology',
    description: 'Expertise in software development, networking, and human-computer interaction.',
    duration: '4 Years',
    slots: 45
  },
  {
    id: 'BSCPE',
    title: 'BS in Computer Engineering',
    description: 'Specialization in hardware design, microprocessor systems, and network integration.',
    duration: '4 Years',
    slots: 40
  },
  {
    id: 'BEEd Gen',
    title: 'BE in Elementary Education (General)',
    description: 'Core pedagogies and strategies for all elementary grade levels.',
    duration: '4 Years',
    slots: 60
  },
  {
    id: 'BSBA HRM',
    title: 'BSBA in Human Resource Management',
    description: 'Strategic personnel management, labor laws, and corporate organizational behavior.',
    duration: '4 Years',
    slots: 50
  },
  {
    id: 'BS ENTREP',
    title: 'BS in Entrepreneurship',
    description: 'Focus on business innovation, venture creation, and strategic risk management.',
    duration: '4 Years',
    slots: 45
  },
  {
    id: 'BECEd',
    title: 'BE in Early Childhood Education',
    description: 'Expertise in early childhood development and preschool education methods.',
    duration: '4 Years',
    slots: 40
  },
  {
    id: 'BECEd SCI',
    title: 'BECEd - Specialization in Science',
    description: 'Science-focused early education strategies and elementary science teaching.',
    duration: '4 Years',
    slots: 35
  },
  {
    id: 'BTLED-ICT',
    title: 'BT in Livelihood Education (ICT)',
    description: 'Technology-driven livelihood education and ICT pedagogical skills.',
    duration: '4 Years',
    slots: 30
  },
  {
    id: 'TCP',
    title: 'Teacher Certificate Program',
    description: 'Professional education units for non-education degree holders.',
    duration: '1 Year',
    slots: 100
  }
];

export const YEAR_LEVELS: YearLevel[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const ENROLLMENT_TYPES = [
  {
    id: 'Regular',
    title: 'Regular Student',
    description: 'Full-load student following the standard curriculum sequence.',
    icon: 'UserCheck'
  },
  {
    id: 'Irregular',
    title: 'Irregular Student',
    description: 'Students with balanced subjects or varying academic loads.',
    icon: 'UserMinus'
  },
  {
    id: 'Returnee',
    title: 'Returnee',
    description: 'Students returning after a leave of absence or stop-out.',
    icon: 'RotateCcw'
  }
];
