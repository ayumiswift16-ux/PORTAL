import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  IdCard, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { ENROLLMENT_TYPES, COURSES, YEAR_LEVELS } from '@/src/constants';
import { StudentInfo, EnrollmentType, Course, YearLevel } from '@/src/types';
import { cn } from '@/src/utils/cn';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { id: 1, title: 'Student info', description: 'Personal details' },
  { id: 2, title: 'Enrollment', description: 'Select type' },
  { id: 3, title: 'Course', description: 'Academic path' },
];

const INITIAL_STUDENT_INFO: StudentInfo = {
  firstName: '',
  middleName: '',
  lastName: '',
  age: '',
  gender: 'Male',
  address: '',
  contactNumber: '',
  email: '',
  birthday: '',
  studentId: '',
  yearLevel: '1st Year',
};

export default function Enroll() {
  const [currentStep, setCurrentStep] = useState(1);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>(INITIAL_STUDENT_INFO);
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>('Regular');
  const [selectedCourse, setSelectedCourse] = useState<Course>('BSIT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#4f46e5', '#10b981']
      });
      toast.success('Enrollment submitted successfully!');
    }, 2000);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setStudentInfo(INITIAL_STUDENT_INFO);
    setIsSuccess(false);
    navigate('/records');
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="h-14 w-14" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold text-slate-900 mb-2"
        >
          Congratulations!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-500 max-w-md mb-8"
        >
          Your enrollment application for <strong>{studentInfo.firstName} {studentInfo.lastName}</strong> has been successfully submitted to CdM.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4"
        >
          <Button onClick={handleReset} variant="primary" size="lg">View Student Records</Button>
          <Button onClick={() => setIsSuccess(false)} variant="outline" size="lg">Enroll Another</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3 w-3" />
            Qualification Phase
          </span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">New Student Enrollment</h2>
          <p className="text-slate-500">Fill out the requirements to qualify for admission.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
          Step {currentStep} of 3
        </div>
      </div>

      {/* Stepper */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-10 px-12" />
        <div className="flex justify-between">
          {STEPS.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-3 bg-slate-50 px-4">
              <motion.div
                animate={{
                  backgroundColor: currentStep >= step.id ? '#2563eb' : '#f1f5f9',
                  color: currentStep >= step.id ? '#ffffff' : '#94a3b8',
                  scale: currentStep === step.id ? 1.1 : 1
                }}
                className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
              >
                {currentStep > step.id ? <CheckCircle2 className="h-6 w-6" /> : step.id}
              </motion.div>
              <div className="text-center hidden sm:block">
                <p className={cn("text-xs font-bold uppercase tracking-wider", currentStep >= step.id ? "text-blue-600" : "text-slate-400")}>
                  {step.title}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card glass className="border-none shadow-xl shadow-slate-200/30">
            <CardContent className="p-10">
              {/* Step 1: Student Information */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <User className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input 
                      label="First Name" 
                      placeholder="e.g. Juan" 
                      value={studentInfo.firstName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, firstName: e.target.value })}
                    />
                    <Input 
                      label="Middle Name" 
                      placeholder="e.g. Dela Cruz" 
                      value={studentInfo.middleName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, middleName: e.target.value })}
                    />
                    <Input 
                      label="Last Name" 
                      placeholder="e.g. Ramos" 
                      value={studentInfo.lastName}
                      onChange={(e) => setStudentInfo({ ...studentInfo, lastName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Input 
                      label="Age" 
                      placeholder="20" 
                      value={studentInfo.age}
                      onChange={(e) => setStudentInfo({ ...studentInfo, age: e.target.value })}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Gender</label>
                      <select 
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={studentInfo.gender}
                        onChange={(e) => setStudentInfo({ ...studentInfo, gender: e.target.value })}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <Input 
                      label="Birthday" 
                      type="date"
                      value={studentInfo.birthday}
                      onChange={(e) => setStudentInfo({ ...studentInfo, birthday: e.target.value })}
                    />
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Year Level</label>
                      <select 
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={studentInfo.yearLevel}
                        onChange={(e) => setStudentInfo({ ...studentInfo, yearLevel: e.target.value as YearLevel })}
                      >
                        {YEAR_LEVELS.map(lvl => <option key={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Address" 
                        className="pl-10" 
                        placeholder="Complete residential address" 
                        value={studentInfo.address}
                        onChange={(e) => setStudentInfo({ ...studentInfo, address: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <IdCard className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Student ID (if available)" 
                        className="pl-10" 
                        placeholder="20XX-XXXXX" 
                        value={studentInfo.studentId}
                        onChange={(e) => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Contact Number" 
                        className="pl-10" 
                        placeholder="09XX XXX XXXX" 
                        value={studentInfo.contactNumber}
                        onChange={(e) => setStudentInfo({ ...studentInfo, contactNumber: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        label="Email Address" 
                        className="pl-10" 
                        placeholder="example@email.com" 
                        value={studentInfo.email}
                        onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Enrollment Type */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-slate-900 text-center justify-center mb-8">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Info className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">Select Enrollment Type</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {ENROLLMENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setEnrollmentType(type.id as EnrollmentType)}
                        className={cn(
                          "relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group",
                          enrollmentType === type.id 
                            ? "border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/10" 
                            : "border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        )}
                      >
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                          enrollmentType === type.id ? "bg-blue-600 text-white" : "bg-white text-slate-400 shadow-sm"
                        )}>
                          {/* We'd map icons here appropriately */}
                          <CardTitle className={cn(enrollmentType === type.id ? "text-white" : "text-slate-400")}>{type.id[0]}</CardTitle>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">{type.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{type.description}</p>
                        
                        {enrollmentType === type.id && (
                          <motion.div
                            layoutId="active-type"
                            className="absolute top-4 right-4 h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center text-white"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>

                  <Card className="bg-blue-900 text-white p-6 border-none">
                    <div className="flex gap-4">
                      <Info className="h-6 w-6 text-blue-300 shrink-0" />
                      <div>
                        <p className="font-bold mb-1">Important Note</p>
                        <p className="text-sm text-blue-100 opacity-80">
                          Please ensure you have selected the correct enrollment category. "Regular" is for students who passed all subjects from the previous semester. "Irregular" for those with back subjects, and "Returnee" for those coming back from a halt in studies.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Step 3: Course & Confirmation */}
              {currentStep === 3 && (
                <div className="space-y-10">
                  <div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                       Course Selection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {COURSES.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => setSelectedCourse(course.id)}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all",
                            selectedCourse === course.id 
                              ? "border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/10" 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-xs font-black px-2 py-1 rounded bg-slate-100", selectedCourse === course.id && "bg-blue-600 text-white")}>
                              {course.id}
                            </span>
                            {selectedCourse === course.id && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                          </div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{course.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">{course.slots} slots remaining</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-10">
                    <h3 className="text-xl font-bold mb-6">Review Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ring-1 ring-slate-100 p-8 rounded-3xl bg-slate-50/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <GraduationCap className="h-40 w-40" />
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Student Profile</p>
                        <div>
                          <p className="text-2xl font-black text-slate-900">{studentInfo.firstName} {studentInfo.lastName}</p>
                          <p className="text-sm text-slate-500 font-medium">{studentInfo.email} • {studentInfo.contactNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Student ID</p>
                            <p className="text-sm font-bold text-slate-700">{studentInfo.studentId || 'New Student'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Year Level</p>
                            <p className="text-sm font-bold text-slate-700">{studentInfo.yearLevel}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Enrollment Details</p>
                        <div className="p-4 bg-white rounded-2xl shadow-sm space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Course</span>
                            <span className="font-bold text-blue-600">{selectedCourse}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Academic Type</span>
                            <span className="font-bold text-slate-900">{enrollmentType}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Semester</span>
                            <span className="font-bold text-slate-900">1st Semester 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Step
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    className="gap-2 min-w-[140px]"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    className="gap-2 min-w-[160px] bg-emerald-600 hover:bg-emerald-700 border-none shadow-emerald-500/20"
                  >
                    Confirm & Enroll
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
