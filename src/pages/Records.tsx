import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  File,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  IdCard,
  User,
  Hash,
  School,
  Clock,
  ShieldCheck,
  Briefcase,
  Users
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { EnrollmentRecord, TeacherRequest } from '@/src/types';
import toast from 'react-hot-toast';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where, limit, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { COURSES } from '@/src/constants';
import { sendNotification } from '@/src/lib/notifications';

interface RecordsProps {
  user: any;
}

export default function Records({ user }: RecordsProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'professors'>('students');
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [teacherRequests, setTeacherRequests] = useState<TeacherRequest[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EnrollmentRecord | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<EnrollmentRecord | null>(null);
  const [validationData, setValidationData] = useState({ 
    studentId: '', 
    section: '',
    examDate: '',
    examStartTime: '',
    examEndTime: '',
    examVenue: ''
  });
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [sections, setSections] = useState<{name: string, yearLevel: string}[]>([]);
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [profDeleteId, setProfDeleteId] = useState<string | null>(null);
  const [profSectionAssign, setProfSectionAssign] = useState<Record<string, string[]>>({});
  const [profSectionSearch, setProfSectionSearch] = useState<string>('');
  const [isProfSectionsModalOpen, setIsProfSectionsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<TeacherRequest | null>(null);
  
  const navigate = useNavigate();

  const formatTime = (time?: string) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'pm' : 'am';
      const formattedHours = h % 12 || 12;
      return `${formattedHours}:${minutes}${ampm}`;
    } catch (e) {
      return time;
    }
  };

  const filteredSectionsForStudent = useMemo(() => {
    if (!selectedRecord) return [];
    // Filter sections by year level and check if the section name includes either the primary course or the second choice ID
    return sections.filter(section => {
      const matchesYear = section.yearLevel === selectedRecord.yearLevel;
      const matchesPrimary = section.name.toLowerCase().includes(selectedRecord.course.toLowerCase());
      const matchesSecond = selectedRecord.secondChoice ? section.name.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase()) : false;
      return matchesYear && (matchesPrimary || matchesSecond);
    });
  }, [sections, selectedRecord]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    enrollments.forEach(enroll => {
      const sec = enroll.section || enroll.studentInfo.section;
      if (sec && enroll.status === 'Enrolled') {
        counts[sec] = (counts[sec] || 0) + 1;
      }
    });
    return counts;
  }, [enrollments]);

  useEffect(() => {
    // Real-time Enrollments
    let qEnroll;
    if (user?.role === 'professor') {
      const professorSections = user.assignedSections || (user.assignedSection ? [user.assignedSection] : []);
      if (professorSections.length > 0) {
        // Firestore 'in' operator supports up to 30 items
        qEnroll = query(
          collection(db, 'enrollments'), 
          where('section', 'in', professorSections), 
          where('status', '==', 'Enrolled')
        );
      } else {
        // If no sections assigned, show nothing for professors
        qEnroll = query(collection(db, 'enrollments'), where('section', '==', 'NONE_ASSIGNED'));
      }
    } else {
      qEnroll = query(collection(db, 'enrollments'), orderBy('updatedAt', 'desc'), limit(100));
    }

    const unsubscribeEnroll = onSnapshot(qEnroll, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as EnrollmentRecord[];
      setEnrollments(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'enrollments'));

    // Real-time Users (for profile pictures) - ONLY FOR ADMINS as per security rules
    let unsubscribeUsers = () => {};
    if (user?.role === 'admin') {
      const qUsers = query(collection(db, 'users'), where('role', '==', 'student'));
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        const profileMap: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          const userData = doc.data() as { profilePicture?: string };
          if (userData.profilePicture) {
            profileMap[doc.id] = userData.profilePicture;
          }
        });
        setStudentProfiles(profileMap);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    }

    // Real-time Sections
    const unsubscribeSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
      const sectionData = snapshot.docs.map(doc => doc.data() as {name: string, yearLevel: string});
      setSections(sectionData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sections'));

    // Real-time Teacher Requests (only for admins)
    let unsubscribeProf = () => {};
    if (user?.role === 'admin') {
      const qProf = query(collection(db, 'teacher_requests'), orderBy('createdAt', 'desc'));
      unsubscribeProf = onSnapshot(qProf, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as TeacherRequest[];
        setTeacherRequests(data);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'teacher_requests'));
    }

    return () => {
      unsubscribeEnroll();
      unsubscribeUsers();
      unsubscribeSections();
      unsubscribeProf();
    };
  }, [user]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(enrollment => {
      const matchesSearch = (
        enrollment.studentInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.studentInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (enrollment.studentId && enrollment.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (enrollment.studentInfo.studentId && enrollment.studentInfo.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (enrollment.userId && enrollment.userId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      const matchesCourse = filterCourse === 'All' || enrollment.course === filterCourse;
      const enrollmentSection = enrollment.section || enrollment.studentInfo.section;
      const matchesSection = filterSection === 'All' || enrollmentSection === filterSection;
      return matchesSearch && matchesCourse && matchesSection;
    });
  }, [enrollments, searchTerm, filterCourse, filterSection]);

  const filteredProfessors = useMemo(() => {
    return teacherRequests.filter(req => 
      req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teacherRequests, searchTerm]);

  const handleApproveProfessor = async (request: TeacherRequest) => {
    try {
      const assignedSections = profSectionAssign[request.id] || [];
      if (assignedSections.length === 0) {
        toast.error("Please assign at least one section to this professor.");
        return;
      }

      // 1. Mark request as approved
      await updateDoc(doc(db, 'teacher_requests', request.id), { 
        status: 'approved',
        assignedSections 
      });
      
      // 2. Create user record
      const sanitizedUsername = request.username.toLowerCase().replace(/\s+/g, '');
      const officialEmail = `${sanitizedUsername}@school.portal`;
      const userDocId = (request as any).uid || sanitizedUsername;
      
      await setDoc(doc(db, 'users', userDocId), {
        fullName: request.fullName,
        institute: request.institute,
        username: sanitizedUsername,
        gmail: request.email, // Store their gmail for easier lookup
        email: officialEmail,
        password: request.password,
        role: 'professor',
        assignedSections,
        assignedSection: assignedSections[0], // for legacy
        createdAt: new Date().toISOString()
      }, { merge: true });

      // If they had a username-based doc that was different (due to sanitization), we should probably delete it or link it
      if (userDocId !== request.username) {
         // This handles cases where people already have a doc by unsanitized username
         await setDoc(doc(db, 'users', request.username), {
            assignedSections,
            assignedSection: assignedSections[0] || null,
            email: officialEmail,
            role: 'professor'
         }, { merge: true });
      }

      // 3. Add to admins collection for rules access via email as ID
      const emailId = officialEmail; // Safe ID
      await setDoc(doc(db, 'admins', emailId), {
        email: officialEmail,
        name: request.fullName,
        role: 'professor', // Use lowercase for consistency
        assignedSections,
        assignedSection: assignedSections[0] || null
      });
      
      // Also add their real Gmail if provided
      if (request.email) {
        const gmailId = request.email;
        await setDoc(doc(db, 'admins', gmailId), {
          email: request.email,
          name: request.fullName,
          role: 'professor', // Use lowercase for consistency
          assignedSections,
          assignedSection: assignedSections[0] || null
        });
      }
      
      toast.success(`${request.fullName} approved as Professor!`);
    } catch (error) {
      console.error("Error approving professor:", error);
      toast.error('Failed to approve professor.');
    }
  };

  const handleOpenValidate = (record: EnrollmentRecord) => {
    setSelectedRecord(record);
    setValidationData({ 
      studentId: record.studentId || record.studentInfo.studentId || '', 
      section: record.section || record.studentInfo.section || '',
      examDate: record.examDate || '',
      examStartTime: record.examStartTime || '',
      examEndTime: record.examEndTime || '',
      examVenue: record.examVenue || ''
    });
    
    // Initialize registration form if not exists
    if (record.registrationForm) {
      setRegistrationData(record.registrationForm);
    } else {
      setRegistrationData({
        academicYear: '2025-2026',
        semester: '1',
        program: record.course,
        institute: 'None entered',
        courses: [],
        assessedFees: {
          tuition: 0, admission: 0, athletic: 0, computer: 0, cultural: 0,
          developmental: 0, guidance: 0, laboratory: 0, library: 0,
          medicalDental: 0, nstp: 0, registration: 0, schoolId: 0,
          handbook: 0, total: 0
        },
        paymentDetails: { mode: 'UNIFFAST', amount: 'c/o UNIFAST', date: new Date().toLocaleDateString() }
      });
    }
    
    setIsValidationModalOpen(true);
  };

  const handleRegistrationSubmit = async () => {
    if (!selectedRecord || !registrationData) return;
    
    try {
      const docRef = doc(db, 'enrollments', selectedRecord.id);
      const now = new Date().toISOString();
      
      // Determine if course needs to change based on section
      let finalCourse = selectedRecord.course;
      if (selectedRecord.yearLevel === '1st Year' && selectedRecord.secondChoice && validationData.section) {
        const isSecondChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase());
        const isFirstChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.course.toLowerCase());
        if (isSecondChoiceSection && !isFirstChoiceSection) {
          finalCourse = selectedRecord.secondChoice;
        }
      }

      const updates: any = {
        status: 'Enrolled' as const,
        studentId: validationData.studentId,
        section: validationData.section,
        course: finalCourse,
        enrolledAt: now,
        updatedAt: now, 
        'studentInfo.studentId': validationData.studentId,
        'studentInfo.section': validationData.section,
        registrationForm: { ...registrationData, program: finalCourse }
      };
      
      await updateDoc(docRef, updates);

      // Send notification to student
      if (selectedRecord.userId) {
        const oldId = selectedRecord.studentId || selectedRecord.studentInfo.studentId;
        const oldSection = selectedRecord.section || selectedRecord.studentInfo.section;
        const idChanged = validationData.studentId !== oldId;
        const sectionChanged = validationData.section !== oldSection;

        let message = `Your enrollment for ${selectedRecord.course} has been finalized.`;
        if (idChanged && sectionChanged) {
          message += ` Your student number is now ${validationData.studentId} and your section is ${validationData.section}.`;
        } else if (idChanged) {
          message += ` Your student number is now ${validationData.studentId}.`;
        } else if (sectionChanged) {
          message += ` Your assigned section is ${validationData.section}.`;
        }
        message += " You can now view your Official Registration Form.";

        await sendNotification(
          selectedRecord.userId,
          'Enrollment Finalized',
          message,
          'success'
        );
      }

      setIsRegistrationModalOpen(false);
      setIsValidationModalOpen(false);
      toast.success('Registration Form Saved successfully!');
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to save registration form.");
    }
  };

  const handleValidateSubmit = async (newStatus?: 'Enrolled' | 'Validating') => {
    if (!selectedRecord) return;
    
    const targetStatus = newStatus || 'Enrolled';
    const now = new Date().toISOString();
    
    try {
      const docRef = doc(db, 'enrollments', selectedRecord.id);
      
      // Determine if course needs to change based on section
      let finalCourse = selectedRecord.course;
      if (selectedRecord.yearLevel === '1st Year' && selectedRecord.secondChoice && validationData.section) {
        const isSecondChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase());
        const isFirstChoiceSection = validationData.section.toLowerCase().includes(selectedRecord.course.toLowerCase());
        if (isSecondChoiceSection && !isFirstChoiceSection) {
          finalCourse = selectedRecord.secondChoice;
        }
      }

      const updates: any = {
        status: targetStatus,
        course: finalCourse,
        studentId: validationData.studentId,
        section: validationData.section,
        examDate: validationData.examDate,
        examStartTime: validationData.examStartTime,
        examEndTime: validationData.examEndTime,
        examVenue: validationData.examVenue,
        updatedAt: now,
        'studentInfo.studentId': validationData.studentId,
        'studentInfo.section': validationData.section
      };

      if (targetStatus === 'Enrolled') {
        updates.enrolledAt = now;
      }

      await updateDoc(docRef, updates);

      // Send notification to student
      if (selectedRecord.userId) {
        let message = '';
        let title = '';

        if (targetStatus === 'Enrolled') {
          title = selectedRecord.status === 'Enrolled' ? 'Record Updated' : 'Enrollment Approved';
          message = `Your enrollment for ${selectedRecord.course} has been approved! Your student number is ${validationData.studentId} and section is ${validationData.section}.`;
        } else if (validationData.examDate) {
          title = 'Entrance Exam Scheduled';
          message = `Your entrance exam has been scheduled for ${validationData.examDate} at ${formatTime(validationData.examStartTime)} - ${formatTime(validationData.examEndTime)} (${validationData.examVenue}). Please be on time.`;
        } else {
          title = 'Information Updated';
          message = 'Your student information has been updated by the registrar.';
        }

        await sendNotification(selectedRecord.userId, title, message, 'info');
      }

      setIsValidationModalOpen(false);
      toast.success(targetStatus === 'Enrolled' ? 'Student enrolled successfully!' : 'Information updated & exam scheduled!');
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Failed to update student information.");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    // Find the record first to get the userId
    const recordToDelete = enrollments.find(e => e.id === deleteConfirmId);
    
    try {
      // 1. Delete Enrollment Record
      await deleteDoc(doc(db, 'enrollments', deleteConfirmId));
      
      // 2. Clear associated user data if userId exists
      if (recordToDelete?.userId) {
        // Delete user document from 'users' collection
        await deleteDoc(doc(db, 'users', recordToDelete.userId));
        
        // Delete notifications associated with this user
        const notifQuery = query(collection(db, 'notifications'), where('userId', '==', recordToDelete.userId));
        const notifSnap = await getDocs(notifQuery);
        const deleteNotifPromises = notifSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteNotifPromises);
      }
      
      toast.success('Record and student data wiped successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to wipe record. Check your permissions.");
      setDeleteConfirmId(null);
    }
  };

  const confirmDeleteProfessor = async () => {
    if (!profDeleteId) return;
    const prof = teacherRequests.find(p => p.id === profDeleteId);
    if (!prof) {
      setProfDeleteId(null);
      return;
    }

    try {
      // 1. Delete from teacher_requests
      await deleteDoc(doc(db, 'teacher_requests', profDeleteId));

      // 2. Delete from users
      const sanitizedUsername = prof.username.toLowerCase().replace(/\s+/g, '');
      const userDocsToDelete = new Set([sanitizedUsername, prof.username]);
      if ((prof as any).uid) userDocsToDelete.add((prof as any).uid);
      
      for (const id of Array.from(userDocsToDelete)) {
         await deleteDoc(doc(db, 'users', id));
      }

      // 3. Delete from admins
      const officialEmail = `${sanitizedUsername}@school.portal`;
      const adminDocsToDelete = new Set([officialEmail]);
      if (prof.email) adminDocsToDelete.add(prof.email);

      for (const id of Array.from(adminDocsToDelete)) {
         await deleteDoc(doc(db, 'admins', id));
      }

      toast.success('Professor account and all related records deleted.');
    } catch (error) {
      console.error("Professor delete error:", error);
      toast.error('Failed to fully delete professor account.');
    } finally {
      setProfDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {user?.role === 'professor' ? 'Class List' : 'University Records'}
          </h2>
          <p className="text-slate-500 mt-1">
            {user?.role === 'professor' 
              ? `Viewing enrolled students for section ${user.assignedSection}`
              : 'Manage student applications and professor account requests.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('students')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                activeTab === 'students' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Students
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('professors')}
                className={cn(
                  "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                  activeTab === 'professors' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Professors
                {teacherRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="h-4 w-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center animate-pulse">
                    {teacherRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {activeTab === 'students' ? (
        <>
          {/* Section Counts Summary */}
          <div className="flex flex-wrap gap-4 overflow-x-auto pb-4 custom-scrollbar">
            <button
              onClick={() => setFilterSection('All')}
              className={cn(
                "flex flex-col bg-white border rounded-2xl p-4 min-w-[160px] shadow-sm transition-all text-left group relative overflow-hidden",
                filterSection === 'All' ? "border-blue-600 ring-4 ring-blue-600/10" : "border-slate-100 hover:border-blue-300 hover:shadow-md"
              )}
            >
              {filterSection === 'All' && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
              )}
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">View Mode</span>
              <span className="text-base font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">SHOW ALL</span>
              <div className="flex items-center gap-1.5 mt-auto">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[11px] font-bold text-slate-500 uppercase">{enrollments.length} Records</p>
              </div>
            </button>

            {Object.entries(sectionCounts).length > 0 ? (
              Object.entries(sectionCounts).sort().map(([section, count]) => (
                <button 
                  key={section} 
                  onClick={() => setFilterSection(section)}
                  className={cn(
                    "flex flex-col bg-white border rounded-2xl p-4 min-w-[160px] shadow-sm transition-all text-left group relative overflow-hidden",
                    filterSection === section ? "border-emerald-600 ring-4 ring-emerald-600/10" : "border-slate-100 hover:border-emerald-300 hover:shadow-md"
                  )}
                >
                  {filterSection === section && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
                  )}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Section</span>
                  <span className="text-base font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{section}</span>
                  <div className="flex items-center gap-1.5 mt-auto">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-bold text-slate-500 uppercase">{count} Students</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 min-w-[200px]">
                <p className="text-xs text-slate-400 font-medium italic">No sections with students found</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Student List {filterSection !== 'All' && <span className="text-blue-600">— {filterSection}</span>}
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                {filteredEnrollments.length} Result{filteredEnrollments.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filterSection !== 'All' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilterSection('All')}
                className="text-[10px] font-bold uppercase tracking-widest h-8 text-blue-600 hover:bg-blue-50"
              >
                Clear Section Filter
              </Button>
            )}
          </div>

          <Card glass className="border-none shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-200/50 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select 
                      className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer"
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                    >
                      <option value="All">All Courses</option>
                      {COURSES.map(course => (
                        <option key={course.id} value={course.id}>{course.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Profile</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course & Year</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Applied on</th>
                    {user?.role === 'admin' && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEnrollments.length > 0 ? (
                    filteredEnrollments.map((enrollment, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white overflow-hidden",
                              (studentProfiles[enrollment.userId || ''] || enrollment.studentInfo.documents?.twoByTwoPhoto) ? "bg-white" : "bg-indigo-50 text-indigo-600"
                            )}>
                              {studentProfiles[enrollment.userId || ''] ? (
                                <img src={studentProfiles[enrollment.userId || '']} alt="Profile" className="w-full h-full object-cover" />
                              ) : enrollment.studentInfo.documents?.twoByTwoPhoto ? (
                                <img src={enrollment.studentInfo.documents.twoByTwoPhoto} alt="Record Photo" className="w-full h-full object-cover" />
                              ) : (
                                <span className="uppercase">{enrollment.studentInfo.firstName[0]}{enrollment.studentInfo.lastName[0]}</span>
                              )}
                            </div>
                            <div>
                              <p 
                                onClick={() => setSelectedDetailRecord(enrollment)}
                                className="text-sm font-bold text-slate-900 cursor-pointer hover:text-blue-600 hover:underline transition-colors decoration-blue-600/30 underline-offset-2"
                              >
                                {enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}
                              </p>
                              <p className="text-xs text-slate-500">{enrollment.studentInfo.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-black text-slate-900 leading-tight">{enrollment.course}</p>
                              {enrollment.status !== 'Enrolled' && enrollment.secondChoice && (
                                <span className="text-[9px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded leading-none">/ {enrollment.secondChoice}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{enrollment.yearLevel}</p>
                              {enrollment.studentInfo.documents && (enrollment.studentInfo.documents.summaryOfGrades || enrollment.studentInfo.documents.goodMoral || enrollment.studentInfo.documents.twoByTwoPhoto || enrollment.studentInfo.documents.birthCertificate) && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecord(enrollment);
                                    setValidationData({
                                      studentId: enrollment.studentId || '',
                                      section: enrollment.section || ''
                                    });
                                  }}
                                  className="flex items-center gap-0.5 text-[7px] font-black text-white bg-slate-900 px-1.5 py-0.5 rounded shadow-sm hover:bg-black transition-colors cursor-pointer active:scale-95" 
                                  title="Click to view uploaded documents"
                                >
                                  DOCS
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            {enrollment.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                            enrollment.status === 'Enrolled' ? "bg-emerald-100 text-emerald-700" :
                            enrollment.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                            enrollment.status === 'Validating' ? (
                              enrollment.studentInfo.yearLevel === '1st Year' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            ) :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {(enrollment.status === 'Validating' && enrollment.studentInfo.yearLevel === '1st Year') ? 'Assessment' : enrollment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-400">
                          {(enrollment.submittedAt || enrollment.enrolledAt).split('T')[0]}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleOpenValidate(enrollment)}
                                className={cn(
                                  "px-4 py-2 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-2",
                                  enrollment.status === 'Enrolled' ? "bg-slate-600 hover:bg-slate-700" : "bg-amber-500 hover:bg-emerald-600 shadow-amber-500/10"
                                )}
                              >
                                {enrollment.status === 'Enrolled' ? 'Edit Info' : 'Update'}
                              </button>
                              <button 
                                onClick={() => handleDelete(enrollment.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <Search className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-900">No records found</p>
                            <p className="text-sm text-slate-500">We couldn't find any students matching your criteria.</p>
                          </div>
                          <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterCourse('All'); setFilterSection('All'); }}>
                            Clear Filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium text-left">
                Showing <span className="font-bold text-slate-900">{filteredEnrollments.length}</span> out of <span className="font-bold text-slate-900">{enrollments.length}</span> students
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg disabled:opacity-30" disabled>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 rounded-lg bg-blue-600 text-white text-xs font-bold">1</button>
                  <button className="h-8 w-8 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors">2</button>
                  <button className="h-8 w-8 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors">3</button>
                </div>
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card glass className="border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Professor Requests</CardTitle>
                <CardDescription>Review and approve account creation requests for professors.</CardDescription>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search professors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none transition-all"
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Professor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Institute</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Account Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Requested on</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfessors.length > 0 ? (
                  filteredProfessors.map((prof, i) => (
                    <tr key={prof.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm border border-orange-100">
                            {prof.fullName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{prof.fullName}</p>
                            <p className="text-xs text-slate-500">{prof.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded tracking-widest">{prof.institute}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-bold text-slate-700">Account: {prof.username}</p>
                          <div className="flex flex-wrap gap-1">
                            {(profSectionAssign[prof.id] || (prof as any).assignedSections || []).map((s: string) => (
                              <span key={s} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                                {s}
                              </span>
                            ))}
                            <button 
                              onClick={() => {
                                setEditingProf(prof);
                                setProfSectionAssign({
                                  ...profSectionAssign,
                                  [prof.id]: (prof as any).assignedSections || profSectionAssign[prof.id] || []
                                });
                                setIsProfSectionsModalOpen(true);
                              }}
                              className="text-[9px] text-blue-600 font-black hover:underline uppercase"
                            >
                              { (profSectionAssign[prof.id] || (prof as any).assignedSections || []).length > 0 ? '+ Manage' : '+ Add Sections' }
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          prof.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          prof.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {prof.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        {prof.createdAt.split('T')[0]}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {prof.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleApproveProfessor(prof)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm('Reject this request?')) {
                                  await updateDoc(doc(db, 'teacher_requests', prof.id), { status: 'rejected' });
                                  toast.error('Professor request rejected.');
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {prof.status !== 'pending' && (
                           <button 
                              onClick={() => setProfDeleteId(prof.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                           >
                            <Trash2 className="h-4 w-4" />
                           </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Users className="h-12 w-12 text-slate-100" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No professor requests found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detailed Student Profile Modal */}
      <AnimatePresence>
        {selectedDetailRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setSelectedDetailRecord(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="relative h-48 grow-0 shrink-0 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 to-indigo-800/40 z-10" />
                {selectedDetailRecord.studentInfo.documents?.twoByTwoPhoto || studentProfiles[selectedDetailRecord.userId || ''] ? (
                  <img 
                    src={studentProfiles[selectedDetailRecord.userId || ''] || selectedDetailRecord.studentInfo.documents?.twoByTwoPhoto} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
                  />
                ) : null}
                
                <button 
                  onClick={() => setSelectedDetailRecord(null)}
                  className="absolute top-8 right-8 z-20 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all group"
                >
                  <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
                </button>

                <div className="absolute -bottom-1 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
                
                <div className="absolute bottom-4 left-10 z-20 flex flex-col md:flex-row items-end gap-6">
                  <div className="h-32 w-32 rounded-[2rem] bg-white p-2 shadow-2xl ring-4 ring-white">
                    <div className="h-full w-full rounded-[1.5rem] bg-slate-50 overflow-hidden flex items-center justify-center">
                      {studentProfiles[selectedDetailRecord.userId || ''] || selectedDetailRecord.studentInfo.documents?.twoByTwoPhoto ? (
                        <img 
                          src={studentProfiles[selectedDetailRecord.userId || ''] || selectedDetailRecord.studentInfo.documents?.twoByTwoPhoto} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-slate-300" />
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">
                      {selectedDetailRecord.studentInfo.firstName} {selectedDetailRecord.studentInfo.middleName ? `${selectedDetailRecord.studentInfo.middleName} ` : ''}{selectedDetailRecord.studentInfo.lastName}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                        {selectedDetailRecord.course}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {selectedDetailRecord.yearLevel}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                        selectedDetailRecord.status === 'Enrolled' ? "text-emerald-600 bg-emerald-50" :
                        selectedDetailRecord.status === 'Pending' ? "text-amber-600 bg-amber-50" :
                        "text-blue-600 bg-blue-50"
                      )}>
                        {selectedDetailRecord.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-10">
                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Column 1: Personal Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <User className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Personal Details</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student ID / ID</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <IdCard className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.studentId || selectedDetailRecord.studentInfo.studentId || 'Not Assigned Yet'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</p>
                          <p className="text-sm font-bold text-slate-800">{selectedDetailRecord.studentInfo.gender}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</p>
                          <p className="text-sm font-bold text-slate-800">{selectedDetailRecord.studentInfo.age} Yrs old</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Birthday</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.studentInfo.birthday}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                        <p className="text-sm font-bold text-slate-800 flex items-start gap-2 leading-relaxed">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 mt-1 shrink-0" />
                          {selectedDetailRecord.studentInfo.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Contact & Enrollment */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Phone className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Contact & Studies</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.studentInfo.email}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.studentInfo.contactNumber}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrollment Type</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.type}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Section</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <School className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.section || selectedDetailRecord.studentInfo.section || 'Not Assigned'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied At</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDetailRecord.submittedAt ? new Date(selectedDetailRecord.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
                        </p>
                      </div>
                      {selectedDetailRecord.enrolledAt && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Enrolled At</p>
                          <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {new Date(selectedDetailRecord.enrolledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Verification status & Docs */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Verification</h4>
                    </div>
                    
                    {selectedDetailRecord.studentInfo.documents ? (
                      <div className="grid grid-cols-2 gap-4">
                        {['summaryOfGrades', 'goodMoral', 'birthCertificate', 'twoByTwoPhoto'].map((docKey) => {
                          const docImg = selectedDetailRecord.studentInfo.documents?.[docKey as keyof typeof selectedDetailRecord.studentInfo.documents];
                          const label = docKey === 'twoByTwoPhoto' ? '2x2 Photo' : docKey.replace(/([A-Z])/g, ' $1').trim();
                          
                          return (
                            <div key={docKey} className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</p>
                              <div 
                                className={cn(
                                  "aspect-[4/3] rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all",
                                  !docImg && "opacity-40"
                                )}
                                onClick={() => docImg && setPreviewImage({ url: docImg, title: label })}
                              >
                                {docImg ? (
                                  <img src={docImg} alt={label} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center gap-1 opacity-40">
                                    <File className="h-5 w-5 text-slate-400" />
                                    <span className="text-[8px] font-black">MISSING</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                        <File className="h-10 w-10 text-slate-100 mb-2" />
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Documents Uploaded</p>
                      </div>
                    )}

                    <div className="mt-4 pt-6 border-t border-slate-100">
                      {user?.role === 'admin' ? (
                        <Button 
                          onClick={() => {
                            handleOpenValidate(selectedDetailRecord);
                            setSelectedDetailRecord(null);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                          {selectedDetailRecord.status === 'Enrolled' ? 'Update Student Record' : 'Process This Enrollment'}
                        </Button>
                      ) : (
                        <p className="text-[10px] font-black text-slate-400 uppercase text-center border-2 border-dashed border-slate-100 py-3 rounded-xl">Read Only View</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Load (If Enrolled) */}
                {selectedDetailRecord.registrationForm && selectedDetailRecord.registrationForm.courses.length > 0 && (
                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold text-slate-900 uppercase text-xs tracking-[0.2em]">Current Academic Load</h4>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                        {selectedDetailRecord.registrationForm.academicYear} | SEM {selectedDetailRecord.registrationForm.semester}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {selectedDetailRecord.registrationForm.courses.map((course, idx) => (
                        <div key={idx} className="p-5 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 transition-colors uppercase tracking-widest leading-none bg-white p-1 px-1.5 rounded-lg border border-slate-100">
                              {course.code}
                            </span>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                              {course.units} Units
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 mb-1 line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">
                            Section: <span className="text-slate-900 font-bold">{course.section}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Validation Modal */}
      <AnimatePresence>
        {isValidationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsValidationModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden text-left mx-auto flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Validate Enrollment</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assign Student ID and Section</p>
                </div>
                <button onClick={() => setIsValidationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <User className="h-16 w-16" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Student Profile</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{selectedRecord?.studentInfo.firstName} {selectedRecord?.studentInfo.lastName}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{selectedRecord?.yearLevel === '1st Year' ? '1st Choice' : 'Program'}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">{selectedRecord?.course}</span>
                    </div>
                    {selectedRecord?.yearLevel === '1st Year' && selectedRecord.secondChoice && (
                      <div className="flex flex-col border-l border-slate-200 pl-2 ml-1">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">2nd Choice</span>
                        <span className="text-[10px] font-black text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 uppercase tracking-widest">{selectedRecord.secondChoice}</span>
                      </div>
                    )}
                    <div className="flex flex-col border-l border-slate-200 pl-2 ml-1">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedRecord?.yearLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Submitted Documents</p>
                    <span className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer" onClick={() => setSelectedDetailRecord(selectedRecord)}>View Detailed Profile</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {['summaryOfGrades', 'goodMoral', 'birthCertificate', 'twoByTwoPhoto'].map((docKey) => {
                      const docImg = selectedRecord?.studentInfo.documents?.[docKey as keyof typeof selectedRecord.studentInfo.documents];
                      const label = docKey === 'twoByTwoPhoto' ? 'Photo' : docKey.replace(/([A-Z])/g, ' $1').trim().split(' ').pop();
                      
                      return (
                        <div key={docKey} className="space-y-1.5 group">
                          <div 
                            className={cn(
                              "aspect-[3/4] w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all",
                              !docImg && "opacity-40 grayscale"
                            )}
                            onClick={() => docImg && setPreviewImage({ url: docImg, title: docKey.replace(/([A-Z])/g, ' $1').trim() })}
                          >
                            {docImg ? (
                              <img src={docImg} alt={label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-1 opacity-40">
                                <File className="h-4 w-4 text-slate-400" />
                                <span className="text-[8px] font-black uppercase">None</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[8px] font-black text-slate-400 uppercase text-center truncate group-hover:text-slate-900 transition-colors uppercase tracking-tight">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  {(selectedRecord?.yearLevel !== '1st Year' || (selectedRecord?.examDate && new Date(selectedRecord.examDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0))) ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Assign Student ID
                        </label>
                        <input
                          value={validationData.studentId}
                          onChange={(e) => setValidationData({ ...validationData, studentId: e.target.value })}
                          placeholder="e.g. 2026-XXXXX"
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Assign Section
                        </label>
                        <select 
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                          value={validationData.section}
                          onChange={(e) => {
                            const newSection = e.target.value;
                            setValidationData({ ...validationData, section: newSection });
                            
                            // If 1st year and has second choice, adjust course if section matches second choice
                            if (selectedRecord?.yearLevel === '1st Year' && selectedRecord.secondChoice) {
                              const isSecondChoiceSection = newSection.toLowerCase().includes(selectedRecord.secondChoice.toLowerCase());
                              const isFirstChoiceSection = newSection.toLowerCase().includes(selectedRecord.course.toLowerCase());
                              
                              if (isSecondChoiceSection && !isFirstChoiceSection) {
                                // Update registration data program if it exists
                                if (registrationData) {
                                  setRegistrationData({ ...registrationData, program: selectedRecord.secondChoice });
                                }
                              } else if (isFirstChoiceSection) {
                                if (registrationData) {
                                  setRegistrationData({ ...registrationData, program: selectedRecord.course });
                                }
                              }
                            }
                          }}
                        >
                          <option value="">Select Section</option>
                          {filteredSectionsForStudent.map(section => (
                            <option key={section.name} value={section.name}>
                              {section.name} ({sectionCounts[section.name] || 0} enrolled)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Entrance Exam Schedule</h4>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Date</label>
                        <input
                          type="date"
                          value={validationData.examDate}
                          onChange={(e) => setValidationData({ ...validationData, examDate: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                          <input
                            type="time"
                            value={validationData.examStartTime}
                            onChange={(e) => setValidationData({ ...validationData, examStartTime: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                          <input
                            type="time"
                            value={validationData.examEndTime}
                            onChange={(e) => setValidationData({ ...validationData, examEndTime: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Venue</label>
                        <input
                          value={validationData.examVenue}
                          onChange={(e) => setValidationData({ ...validationData, examVenue: e.target.value })}
                          placeholder="e.g., Computer Lab 1, 3rd Floor"
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  onClick={() => setIsValidationModalOpen(false)}
                >
                  Cancel
                </Button>
                {(selectedRecord?.yearLevel !== '1st Year' || (selectedRecord?.examDate && new Date(selectedRecord.examDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0))) ? (
                  <Button 
                    className="flex-1 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                    onClick={() => setIsRegistrationModalOpen(true)}
                    disabled={!validationData.studentId || !validationData.section}
                  >
                    Next: Fill Form
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    onClick={() => handleValidateSubmit('Validating')}
                    disabled={!validationData.examDate || !validationData.examVenue}
                  >
                    Schedule Exam
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Form Modal */}
      <AnimatePresence>
        {isRegistrationModalOpen && registrationData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Official Registration Form</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Student: {selectedRecord?.studentInfo.firstName} {selectedRecord?.studentInfo.lastName}</p>
                  </div>
                </div>
                <button onClick={() => setIsRegistrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/30 custom-scrollbar">
                {/* Header Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Academic Year</label>
                    <input 
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={registrationData.academicYear} 
                      onChange={(e) => setRegistrationData({...registrationData, academicYear: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Semester</label>
                    <input 
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={registrationData.semester} 
                      onChange={(e) => setRegistrationData({...registrationData, semester: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Program</label>
                    <input 
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={registrationData.program} 
                      onChange={(e) => setRegistrationData({...registrationData, program: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Institute</label>
                    <input 
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={registrationData.institute} 
                      onChange={(e) => setRegistrationData({...registrationData, institute: e.target.value})} 
                    />
                  </div>
                </div>

                {/* Courses Enrolled */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Courses Enrolled</h4>
                    <Button size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest" onClick={() => {
                      if (selectedRecord?.yearLevel === '1st Year' && registrationData.courses.length >= 10) {
                        toast.error("1st Year students are limited to 10 subjects only.");
                        return;
                      }
                      const newCourse = { code: '', description: '', section: validationData.section, lec: 0, lab: 0, compLab: 0, units: 3, rate: 250, fee: 750 };
                      setRegistrationData({
                        ...registrationData,
                        courses: [...registrationData.courses, newCourse]
                      });
                    }}>Add Course</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-[8px] uppercase font-black text-white tracking-wider">
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Section</th>
                          <th className="px-2 py-3 text-center">Lec</th>
                          <th className="px-2 py-3 text-center">Lab</th>
                          <th className="px-2 py-3 text-center">Comp</th>
                          <th className="px-2 py-3 text-center">Units</th>
                          <th className="px-4 py-3 text-right">Fee</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {registrationData.courses.map((course: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-2 min-w-[100px]">
                              <input 
                                className="w-full h-8 px-2 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500" 
                                value={course.code} 
                                placeholder="e.g. ITELECT4"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].code = e.target.value;
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 min-w-[200px]">
                              <input 
                                className="w-full h-8 px-2 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500" 
                                value={course.description} 
                                placeholder="e.g. ITELECTIVE 4"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].description = e.target.value;
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-24">
                              <input 
                                className="w-full h-8 px-2 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 text-center focus:ring-1 focus:ring-blue-500" 
                                value={course.section} 
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].section = e.target.value;
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-8 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 text-center focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.lec === 0 ? '' : course.lec} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].lec = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-8 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 text-center focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.lab === 0 ? '' : course.lab} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].lab = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-8 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 text-center focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.compLab === 0 ? '' : course.compLab} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].compLab = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 w-12 text-center">
                              <input 
                                type="number" 
                                className="w-full h-8 bg-slate-50 rounded-lg border-none text-[11px] font-bold text-slate-900 text-center focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={course.units === 0 ? '' : course.units} 
                                placeholder="0"
                                onChange={(e) => {
                                  const newCourses = [...registrationData.courses];
                                  newCourses[idx].units = e.target.value === '' ? 0 : Number(e.target.value);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                              />
                            </td>
                            <td className="p-2 text-[11px] font-black text-slate-700 text-right pr-4">
                              ₱{course.fee.toLocaleString()}
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                onClick={() => {
                                  const newCourses = registrationData.courses.filter((_: any, i: number) => i !== idx);
                                  setRegistrationData({...registrationData, courses: newCourses});
                                }} 
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-right px-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Total Units: <span className="text-blue-600 ml-2">{registrationData.courses.reduce((acc: number, c: any) => acc + c.units, 0)}</span>
                    </p>
                  </div>
                </div>

                {/* Fees and Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Assessed Fees
                    </h4>
                    <div className="space-y-2">
                      {Object.keys(registrationData.assessedFees).map((key) => {
                        if (key === 'total') return null;
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <label className="text-[8px] font-black text-slate-900 uppercase tracking-tighter">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <input 
                              type="number" 
                              className="w-20 h-7 text-right px-2 bg-slate-50 rounded-md border-none text-[10px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              value={registrationData.assessedFees[key] === 0 ? '' : registrationData.assessedFees[key]} 
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                const newFees = {...registrationData.assessedFees, [key]: val};
                                const total = Object.keys(newFees).reduce((acc, k) => k === 'total' ? acc : acc + newFees[k], 0);
                                setRegistrationData({...registrationData, assessedFees: {...newFees, total}});
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Amount</p>
                      <p className="text-base font-black text-emerald-600">₱{registrationData.assessedFees.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-900 uppercase tracking-widest ml-1">Mode</label>
                        <input 
                          className="w-full h-8 px-2 bg-slate-50 rounded-lg border-none text-[10px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                          value={registrationData.paymentDetails.mode} 
                          onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, mode: e.target.value}})} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-900 uppercase tracking-widest ml-1">Amount</label>
                        <input 
                          className="w-full h-8 px-2 bg-slate-50 rounded-lg border-none text-[10px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                          value={registrationData.paymentDetails.amount} 
                          onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, amount: e.target.value}})} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-900 uppercase tracking-widest ml-1">Date Paid</label>
                      <input 
                        type="date"
                        className="w-full h-8 px-2 bg-slate-50 rounded-lg border-none text-[10px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                        value={registrationData.paymentDetails.date} 
                        onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, date: e.target.value}})} 
                      />
                    </div>
                    
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest leading-none mb-1">Administrative Note</p>
                        <p className="text-[9px] text-blue-700 leading-normal">Saving this form will finalize the student's enrollment status. This data will be visible on the student's dashboard.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest border-2 border-slate-100"
                  onClick={() => setIsRegistrationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-[#052e16] hover:bg-[#031f0e] rounded-xl h-10 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/20" 
                  onClick={handleRegistrationSubmit}
                >
                  Save & Finalize Enrollment
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col items-center justify-center"
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewImage.url;
                    link.download = `${previewImage.title.toLowerCase().replace(/\s+/g, '_')}.png`;
                    link.click();
                  }}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                  title="Download Document"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="w-full h-full flex items-center justify-center p-4 md:p-12">
                <img 
                  src={previewImage.url} 
                  alt={previewImage.title}
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                />
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <h4 className="text-white font-bold text-xl drop-shadow-md">{previewImage.title}</h4>
                <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Full Image View</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Professor Sections Modal */}
      <AnimatePresence>
        {isProfSectionsModalOpen && editingProf && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsProfSectionsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assign Sections</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Professor: {editingProf.fullName}</p>
                </div>
                <button onClick={() => setIsProfSectionsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sections..."
                    value={profSectionSearch}
                    onChange={(e) => setProfSectionSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned ({profSectionAssign[editingProf.id]?.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {(profSectionAssign[editingProf.id] || []).length > 0 ? (
                      profSectionAssign[editingProf.id].map(s => (
                        <div key={s} className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm">
                          {s}
                          <button 
                            onClick={() => {
                              const updated = profSectionAssign[editingProf.id].filter(sec => sec !== s);
                              setProfSectionAssign({ ...profSectionAssign, [editingProf.id]: updated });
                            }}
                            className="hover:bg-white/20 rounded-lg p-1 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl w-full text-center bg-white/50">
                        <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No sections assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Sections ({editingProf.institute} Only)</p>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {sections
                      .filter(s => {
                        const matchesSearch = s.name.toLowerCase().includes(profSectionSearch.toLowerCase());
                        const notAssigned = !(profSectionAssign[editingProf.id] || []).includes(s.name);
                        
                        // Institute filtering
                        const instituteCourses = COURSES.filter(c => c.institute === editingProf.institute).map(c => c.id.toLowerCase());
                        const sectionNameLower = s.name.toLowerCase();
                        const matchesInstitute = instituteCourses.some(courseId => sectionNameLower.includes(courseId));
                        
                        return matchesSearch && notAssigned && matchesInstitute;
                      })
                      .map(s => (
                        <button
                          key={s.name}
                          onClick={() => {
                            const current = profSectionAssign[editingProf.id] || [];
                            setProfSectionAssign({...profSectionAssign, [editingProf.id]: [...current, s.name]});
                          }}
                          className="flex items-center justify-between text-left px-5 py-4 rounded-[1.25rem] border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-900">{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.yearLevel}</p>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <UserPlus className="h-4 w-4" />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-slate-100 bg-white"
                  onClick={() => setIsProfSectionsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/20"
                  onClick={async () => {
                    if (editingProf.status === 'approved') {
                      try {
                        const sectionsArr = profSectionAssign[editingProf.id] || [];
                        const { doc, updateDoc, setDoc } = await import('firebase/firestore');
                        
                        // Update teacher request
                        await updateDoc(doc(db, 'teacher_requests', editingProf.id), { assignedSections: sectionsArr });
                        
                        // 1. Update user by UID (if they logged in already)
                        if ((editingProf as any).uid) {
                          await setDoc(doc(db, 'users', (editingProf as any).uid), { 
                            assignedSections: sectionsArr,
                            assignedSection: sectionsArr[0] || null 
                          }, { merge: true });
                        }
                        
                        // 2. Update user by username (original portal account)
                        await setDoc(doc(db, 'users', editingProf.username), { 
                          assignedSections: sectionsArr,
                          assignedSection: sectionsArr[0] || null 
                        }, { merge: true });

                        // 3. Update admins collection for Gmail/Portal access migration
                        const officialEmail = `${editingProf.username.toLowerCase()}@school.portal`;
                        const emailId = officialEmail;
                        await setDoc(doc(db, 'admins', emailId), { 
                          assignedSections: sectionsArr,
                          assignedSection: sectionsArr[0] || null 
                        }, { merge: true });

                        if (editingProf.email) {
                          const gmailId = editingProf.email;
                          await setDoc(doc(db, 'admins', gmailId), { 
                            assignedSections: sectionsArr,
                            assignedSection: sectionsArr[0] || null 
                          }, { merge: true });
                        }

                        toast.success("Professor sections updated successfully!");
                      } catch (e) {
                         console.error(e);
                         toast.error("Failed to update sections.");
                      }
                    }
                    setIsProfSectionsModalOpen(false);
                  }}
                >
                  {editingProf.status === 'pending' ? 'Confirm Sections' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-8"
            >
              <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Record?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Are you sure you want to delete this record? This will completely reset the student's enrollment status. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="destructive" 
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest"
                  onClick={confirmDelete}
                >
                  Delete Permanently
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest border-transparent hover:bg-slate-50"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professor Delete Confirmation Modal */}
      <AnimatePresence>
        {profDeleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setProfDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-8"
            >
              <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Professor?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Are you sure you want to delete this professor account? All associated portal access and user data will be removed.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="destructive" 
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest"
                  onClick={confirmDeleteProfessor}
                >
                  Delete Permanently
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest border-transparent hover:bg-slate-50"
                  onClick={() => setProfDeleteId(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
