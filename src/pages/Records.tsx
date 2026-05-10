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
  Briefcase
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { EnrollmentRecord } from '@/src/types';
import toast from 'react-hot-toast';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { COURSES } from '@/src/constants';
import { sendNotification } from '@/src/lib/notifications';

export default function Records() {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EnrollmentRecord | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<EnrollmentRecord | null>(null);
  const [validationData, setValidationData] = useState({ studentId: '', section: '' });
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [sections, setSections] = useState<{name: string, yearLevel: string}[]>([]);
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const filteredSectionsForStudent = useMemo(() => {
    if (!selectedRecord) return [];
    // Filter sections by year level and check if the section name includes the course ID
    return sections.filter(section => 
      section.yearLevel === selectedRecord.yearLevel && 
      section.name.toLowerCase().includes(selectedRecord.course.toLowerCase())
    );
  }, [sections, selectedRecord]);

  useEffect(() => {
    const unsubEnrollments = onSnapshot(
      query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as EnrollmentRecord[];
        setEnrollments(data);
      },
      (error) => {
        console.error("Error fetching enrollments:", error);
        toast.error("Failed to sync records.");
      }
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snapshot) => {
        const profileMap: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          const userData = doc.data() as { profilePicture?: string };
          if (userData.profilePicture) {
            profileMap[doc.id] = userData.profilePicture;
          }
        });
        setStudentProfiles(profileMap);
      },
      (error) => {
        console.error("Error fetching user profiles:", error);
      }
    );

    const unsubSections = onSnapshot(
      collection(db, 'sections'),
      (snapshot) => {
        const sectionData = snapshot.docs.map(doc => doc.data() as {name: string, yearLevel: string});
        setSections(sectionData);
      },
      (error) => {
        console.error("Error fetching sections:", error);
      }
    );
    
    return () => {
      unsubEnrollments();
      unsubUsers();
      unsubSections();
    };
  }, []);

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
      return matchesSearch && matchesCourse;
    });
  }, [enrollments, searchTerm, filterCourse]);

  const handleOpenValidate = (record: EnrollmentRecord) => {
    setSelectedRecord(record);
    setValidationData({ 
      studentId: record.studentId || record.studentInfo.studentId || '', 
      section: record.section || record.studentInfo.section || '' 
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
      const updates = {
        status: 'Enrolled' as const,
        studentId: validationData.studentId,
        section: validationData.section,
        studentInfo: {
          ...selectedRecord.studentInfo,
          studentId: validationData.studentId,
          section: validationData.section
        },
        registrationForm: registrationData
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

  const handleValidateSubmit = async () => {
    if (!selectedRecord) return;
    
    try {
      const docRef = doc(db, 'enrollments', selectedRecord.id);
      const updates = {
        status: 'Enrolled' as const,
        studentId: validationData.studentId,
        section: validationData.section,
        studentInfo: {
          ...selectedRecord.studentInfo,
          studentId: validationData.studentId,
          section: validationData.section
        }
      };
      
      await updateDoc(docRef, updates);

      // Send notification to student
      if (selectedRecord.userId) {
        const oldId = selectedRecord.studentId || selectedRecord.studentInfo.studentId;
        const oldSection = selectedRecord.section || selectedRecord.studentInfo.section;
        const idChanged = validationData.studentId !== oldId;
        const sectionChanged = validationData.section !== oldSection;

        let message = '';
        if (selectedRecord.status === 'Enrolled') {
          if (idChanged && sectionChanged) {
            message = `Your student number has been updated to ${validationData.studentId} and your section to ${validationData.section}.`;
          } else if (idChanged) {
            message = `Your student number has been updated to ${validationData.studentId}.`;
          } else if (sectionChanged) {
            message = `Your assigned section has been updated to ${validationData.section}.`;
          } else {
            message = 'Your student information has been updated by the registrar.';
          }
        } else {
          message = `Your enrollment for ${selectedRecord.course} has been approved! Your student number is ${validationData.studentId} and section is ${validationData.section}.`;
        }

        await sendNotification(
          selectedRecord.userId,
          selectedRecord.status === 'Enrolled' ? 'Record Updated' : 'Enrollment Approved',
          message,
          'success'
        );
      }

      setIsValidationModalOpen(false);
      toast.success(selectedRecord.status === 'Enrolled' ? 'Information updated successfully!' : 'Student verified and enrolled!');
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
    
    try {
      await deleteDoc(doc(db, 'enrollments', deleteConfirmId));
      toast.success('Record deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete record. Check your permissions.");
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Student Records</h2>
          <p className="text-slate-500 mt-1">Manage and view all enrolled student applications.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/enroll')} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add New Record
          </Button>
        </div>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
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
                        <p className="text-sm font-bold text-slate-700">{enrollment.course}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{enrollment.yearLevel}</p>
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
                              className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition-colors cursor-pointer active:scale-95" 
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
                        "bg-blue-100 text-blue-700"
                      )}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                      {enrollment.enrolledAt.split(' ')[0]}
                    </td>
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
                      <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterCourse('All'); }}>
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
                          {selectedDetailRecord.enrolledAt}
                        </p>
                      </div>
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
                      <Button 
                        onClick={() => {
                          handleOpenValidate(selectedDetailRecord);
                          setSelectedDetailRecord(null);
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em]"
                      >
                        {selectedDetailRecord.status === 'Enrolled' ? 'Update Student Record' : 'Process This Enrollment'}
                      </Button>
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
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden text-left"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedRecord?.status === 'Enrolled' ? 'Update Information' : 'Validate Enrollment'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedRecord?.status === 'Enrolled' ? 'Modify Student ID and Section' : 'Assign Student ID and Section'}
                  </p>
                </div>
                <button onClick={() => setIsValidationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Student</p>
                  <p className="text-sm font-bold text-blue-900">{selectedRecord?.studentInfo.firstName} {selectedRecord?.studentInfo.lastName}</p>
                  <p className="text-xs text-blue-600">{selectedRecord?.course} - {selectedRecord?.yearLevel}</p>
                </div>

                {selectedRecord?.studentInfo.documents && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Submitted Documents</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['summaryOfGrades', 'goodMoral', 'birthCertificate', 'twoByTwoPhoto'].map((docKey) => {
                        const docImg = selectedRecord.studentInfo.documents?.[docKey as keyof typeof selectedRecord.studentInfo.documents];
                        const label = docKey === 'twoByTwoPhoto' ? '2x2 Photo' : docKey.replace(/([A-Z])/g, ' $1').trim();
                        
                        return (
                          <div key={docKey} className="space-y-1">
                            <p className="text-[9px] font-bold text-slate-500 uppercase truncate px-1">{label}</p>
                            <div 
                              className={cn(
                                "aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:border-blue-300 transition-colors",
                                !docImg && "opacity-50 grayscale"
                              )}
                              onClick={() => docImg && setPreviewImage({ url: docImg, title: label })}
                            >
                              {docImg ? (
                                <img src={docImg} alt={label} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] text-slate-400 font-bold px-2 text-center">NOT PROVIDED</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <Input 
                    label="Assign Student ID"
                    placeholder="e.g. 2026-XXXXX"
                    value={validationData.studentId}
                    onChange={(e) => setValidationData({ ...validationData, studentId: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Assign Section</label>
                    <select 
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      value={validationData.section}
                      onChange={(e) => setValidationData({ ...validationData, section: e.target.value })}
                    >
                      <option value="">Select Section</option>
                      {filteredSectionsForStudent.map((section) => (
                        <option key={section.name} value={section.name}>
                          {section.name}
                        </option>
                      ))}
                      {filteredSectionsForStudent.length === 0 && (
                        <option value="" disabled>No available sections for this level/course</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsValidationModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className={cn(
                    "flex-1",
                    selectedRecord?.status === 'Enrolled' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#064e3b] hover:bg-[#053d2e]"
                  )}
                  onClick={() => setIsRegistrationModalOpen(true)}
                  disabled={!validationData.studentId || !validationData.section}
                >
                  {selectedRecord?.status === 'Enrolled' ? 'Update Form' : 'Fill Registration Form'}
                </Button>
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
              className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Edit3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Official Registration Form Editor</h3>
                    <p className="text-sm text-slate-500">Student: {selectedRecord?.studentInfo.firstName} {selectedRecord?.studentInfo.lastName}</p>
                  </div>
                </div>
                <button onClick={() => setIsRegistrationModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#fafafa]">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <Input 
                    label="Academic Year" 
                    value={registrationData.academicYear} 
                    onChange={(e) => setRegistrationData({...registrationData, academicYear: e.target.value})} 
                  />
                  <Input 
                    label="Semester" 
                    value={registrationData.semester} 
                    onChange={(e) => setRegistrationData({...registrationData, semester: e.target.value})} 
                  />
                  <Input 
                    label="Program" 
                    value={registrationData.program} 
                    onChange={(e) => setRegistrationData({...registrationData, program: e.target.value})} 
                  />
                  <Input 
                    label="Institute" 
                    value={registrationData.institute} 
                    onChange={(e) => setRegistrationData({...registrationData, institute: e.target.value})} 
                  />
                </div>

                {/* Courses Enrolled */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Courses Enrolled</h4>
                    <Button size="sm" onClick={() => {
                      const newCourse = { code: '', description: '', section: validationData.section, lec: 0, lab: 0, compLab: 0, units: 3, rate: 250, fee: 750 };
                      setRegistrationData({
                        ...registrationData,
                        courses: [...registrationData.courses, newCourse]
                      });
                    }}>Add Course</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500">
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-left">Description</th>
                          <th className="px-4 py-3">Section</th>
                          <th className="px-4 py-3">Lec</th>
                          <th className="px-4 py-3">Lab</th>
                          <th className="px-4 py-3">Comp</th>
                          <th className="px-4 py-3">Units</th>
                          <th className="px-4 py-3">Rate</th>
                          <th className="px-4 py-3">Fee</th>
                          <th className="px-2 py-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registrationData.courses.map((course: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2"><input className="w-full p-2 bg-slate-50 rounded border-none text-xs" value={course.code} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].code = e.target.value;
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input className="w-full p-2 bg-slate-50 rounded border-none text-xs" value={course.description} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].description = e.target.value;
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input className="w-16 p-2 bg-slate-50 rounded border-none text-xs text-right" value={course.section} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].section = e.target.value;
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input type="number" className="w-12 p-2 bg-slate-50 rounded border-none text-xs text-right" value={course.lec} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].lec = Number(e.target.value);
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input type="number" className="w-12 p-2 bg-slate-50 rounded border-none text-xs text-right" value={course.lab} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].lab = Number(e.target.value);
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input type="number" className="w-12 p-2 bg-slate-50 rounded border-none text-xs text-right" value={course.compLab} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].compLab = Number(e.target.value);
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input type="number" className="w-12 p-2 bg-slate-50 rounded border-none text-xs text-right" value={course.units} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].units = Number(e.target.value);
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2"><input type="number" className="w-16 p-2 bg-slate-50 rounded border-none text-xs text-right" value={course.rate} onChange={(e) => {
                              const newCourses = [...registrationData.courses];
                              newCourses[idx].rate = Number(e.target.value);
                              newCourses[idx].fee = newCourses[idx].units * newCourses[idx].rate;
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} /></td>
                            <td className="p-2 text-xs font-bold px-4">₱{course.fee.toLocaleString()}</td>
                            <td className="p-2"><button onClick={() => {
                              const newCourses = registrationData.courses.filter((_: any, i: number) => i !== idx);
                              setRegistrationData({...registrationData, courses: newCourses});
                            }} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                    <p className="text-sm font-bold text-slate-700">Total Units: <span className="text-blue-600">{registrationData.courses.reduce((acc: number, c: any) => acc + c.units, 0)}</span></p>
                  </div>
                </div>

                {/* Fees and Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h4 className="font-bold text-slate-900 pb-2 border-b border-slate-100">Assessed Fees</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.keys(registrationData.assessedFees).map((key) => {
                        if (key === 'total') return null;
                        return (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <input 
                              type="number" 
                              className="w-24 p-2 bg-slate-50 rounded border-none text-xs text-right font-bold" 
                              value={registrationData.assessedFees[key]} 
                              onChange={(e) => {
                                const newFees = {...registrationData.assessedFees, [key]: Number(e.target.value)};
                                const total = Object.keys(newFees).reduce((acc, k) => k === 'total' ? acc : acc + newFees[k], 0);
                                setRegistrationData({...registrationData, assessedFees: {...newFees, total}});
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <p className="font-black text-slate-900 uppercase">Total Amount</p>
                      <p className="text-xl font-black text-emerald-600">₱{registrationData.assessedFees.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <h4 className="font-bold text-slate-900 pb-2 border-b border-slate-100">Payment Details</h4>
                    <div className="space-y-4">
                      <Input 
                        label="Mode of Payment" 
                        value={registrationData.paymentDetails.mode} 
                        onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, mode: e.target.value}})} 
                      />
                      <Input 
                        label="Amount Paid" 
                        value={registrationData.paymentDetails.amount} 
                        onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, amount: e.target.value}})} 
                      />
                      <Input 
                        label="Date Paid" 
                        type="date"
                        value={registrationData.paymentDetails.date} 
                        onChange={(e) => setRegistrationData({...registrationData, paymentDetails: {...registrationData.paymentDetails, date: e.target.value}})} 
                      />
                    </div>
                    
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900 mb-1">Administrative Note</p>
                        <p className="text-xs text-blue-700 leading-relaxed">Saving this form will finalize the student's enrollment status. This data will be visible on the student's dashboard.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsRegistrationModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#064e3b] hover:bg-[#053d2e] px-8" onClick={handleRegistrationSubmit}>
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
    </div>
  );
}
