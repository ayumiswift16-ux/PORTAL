import { ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BackgroundBlobs } from './BackgroundBlobs';
import { User, EnrollmentRecord } from '@/src/types';
import { Menu, X, Camera, Shield, Mail, IdCard, Calendar, Check, Edit2, Save, Flag, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, onSnapshot, query, collection, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/src/utils/cn';
import { sendNotification } from '@/src/lib/notifications';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface MainLayoutProps {
  children: ReactNode;
  user: User | null;
  onLogout: () => void;
}

export function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShowProfile = () => {
    if (user?.role === 'admin') {
      navigate('/settings');
    } else {
      setShowProfileModal(true);
    }
  };


  // Sync enrollment data for student ID
  useEffect(() => {
    if (!user || user.role !== 'student') {
      setEnrollment(null);
      return;
    }

    if (!user?.username) return;

    const q = query(
      collection(db, 'enrollments'),
      where('userId', '==', user.username),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setEnrollment(snapshot.docs[0].data() as EnrollmentRecord);
      } else {
        setEnrollment(null);
      }
    }, (error) => {
      console.error("Error fetching enrollment for profile:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Initialize temp email when modal opens
  useEffect(() => {
    if (showProfileModal && user) {
      setTempEmail(user.email);
    }
  }, [showProfileModal, user]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendReport = async () => {
    if (!reportMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSendingReport(true);
    try {
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminsSnap = await getDocs(adminsQuery);
      const adminIds = adminsSnap.docs.map(doc => doc.id);
      
      if (adminIds.length === 0) {
        toast.error("No administrators found to receive the report");
        setIsSendingReport(false);
        return;
      }

      const promises = adminIds.map(adminId => 
        sendNotification(
          adminId, 
          'New System Report', 
          `Report from ${user?.name} (${user?.email}): ${reportMessage}`, 
          'warning'
        )
      );

      await Promise.all(promises);
      
      toast.success("Report sent to administrators");
      setReportMessage('');
      setShowReportModal(false);
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Failed to send report");
    } finally {
      setIsSendingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:p-0">
      <div className="no-print">
        <BackgroundBlobs />
      </div>
      
      {/* PC Sidebar */}
      <div className="no-print">
        <Sidebar 
          user={user} 
          onLogout={onLogout} 
          isEnrolled={enrollment?.status === 'Enrolled'}
          className="fixed left-0 top-0 bottom-0 w-[240px] z-40 hidden lg:flex"
        />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="no-print flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#051c14] z-50 lg:hidden flex flex-col"
            >
              <Sidebar 
                user={user} 
                onLogout={onLogout} 
                isEnrolled={enrollment?.status === 'Enrolled'}
                onItemClick={() => setIsMobileMenuOpen(false)}
                className="border-none"
              />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-[-48px] bg-[#051c14] text-white p-2 rounded-r-xl"
              >
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[240px] flex flex-col min-h-screen bg-glass-gradient print:pl-0 print:bg-white print:m-0 relative">
        <div className="no-print">
          <Navbar 
            user={user} 
            onMenuClick={() => setIsMobileMenuOpen(true)} 
            onLogout={onLogout}
            onShowProfile={handleShowProfile}
            onShowReport={() => setShowReportModal(true)}
          />
        </div>
        
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden print:p-0 print:m-0 print:overflow-visible">
          {children}
        </main>
      </div>

      {/* Global Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className={cn(
                "h-40 relative shrink-0 overflow-hidden",
                user?.profilePicture ? "bg-slate-900" : "bg-gradient-to-r from-emerald-600 to-green-700"
              )}>
                {user?.profilePicture && (
                  <img src={user.profilePicture} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" />
                )}
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors z-20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-8 pb-10 -mt-20 relative z-10 overflow-y-auto">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 text-center md:text-left">
                  <div className="relative group mx-auto md:mx-0">
                    <div className="h-40 w-40 rounded-[2.5rem] bg-white p-2 shadow-2xl">
                      <div className={cn(
                        "h-full w-full rounded-[2rem] flex items-center justify-center text-5xl font-black overflow-hidden relative",
                        user?.profilePicture ? "bg-slate-50" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {user?.profilePicture ? (
                          <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.[0]
                        )}
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white"
                        >
                          <Camera className="h-10 w-10 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Change Photo</span>
                        </button>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          try {
                            await updateDoc(doc(db, 'users', user.username), { profilePicture: base64 });
                            toast.success("Profile picture updated!");
                          } catch (err) {
                            toast.error("Failed to update picture");
                          }
                        };
                        reader.readAsDataURL(file);
                      }} 
                      className="hidden" 
                      accept="image/*" 
                    />
                  </div>
                  <div className="flex-1 pb-4">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">{user?.name}</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center md:justify-start gap-2">
                      <Shield className="h-4 w-4" />
                      {user?.role === 'admin' ? 'Registrar' : 'Student'} Portal
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group transition-all hover:border-emerald-200">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:text-emerald-600 transition-colors">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Account Email</p>
                        {isEditingEmail ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              autoFocus
                              className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              value={tempEmail}
                              onChange={(e) => setTempEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  toast.error("Email changes must be requested through Registry");
                                  setIsEditingEmail(false);
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                toast.error("Email changes must be requested through Registry");
                                setIsEditingEmail(false);
                              }}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/email">
                            <p className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{user?.email}</p>
                            <button 
                              onClick={() => setIsEditingEmail(true)}
                              className="p-1.5 opacity-0 group-hover/email:opacity-100 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:border-emerald-200">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm transition-colors">
                        <IdCard className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Student ID</p>
                        <p className={cn(
                          "text-sm font-bold",
                          enrollment ? "text-slate-700" : "text-slate-400 italic"
                        )}>
                          {enrollment ? (enrollment.studentId || enrollment.studentInfo.studentId || 'PENDING') : 'No Enrollment'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:border-emerald-200">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm transition-colors">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Member Since</p>
                        <p className="text-sm font-bold text-slate-700">June 2023</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:border-emerald-200">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm transition-colors">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Enrollment Status</p>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest",
                          enrollment?.status === 'Enrolled' ? "bg-emerald-100 text-emerald-600" : 
                          enrollment ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-500"
                        )}>
                           {enrollment?.status === 'Enrolled' && <Check className="h-3 w-3" />}
                           {enrollment?.status || 'Not Enrolled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSendingReport && setShowReportModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                    <Flag className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">System Report</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Support Ticket</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Describe the issue or feedback you'd like to report to the system administrators. We'll look into it as soon as possible.
                </p>
                
                <div className="relative group">
                  <textarea
                    autoFocus
                    placeholder="Type your report message here..."
                    className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all resize-none group-hover:border-slate-300"
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    disabled={isSendingReport}
                  />
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-6 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest"
                    disabled={isSendingReport}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReport}
                    className={cn(
                      "flex-[2] px-6 py-4 text-sm font-bold text-white rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-3",
                      isSendingReport ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 shadow-xl shadow-red-600/30"
                    )}
                    disabled={isSendingReport}
                  >
                    {isSendingReport ? (
                      <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    {isSendingReport ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
