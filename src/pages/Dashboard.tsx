import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar,
  Bell,
  Plus,
  BookOpen,
  Info
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { MOCK_ENROLLMENTS, CHART_DATA } from '@/src/mockData';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { EnrollmentRecord, User as UserType } from '../types';
import { useState, useEffect } from 'react';

const STATS = [
  { label: 'Total Students', value: '1,284', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', trend: '+12.5%' },
  { label: 'Active Enrollees', value: '842', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100', trend: '+8.2%' },
  { label: 'Approved', value: '756', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: '+14.1%' },
  { label: 'Pending Apps', value: '86', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', trend: '-2.4%' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('cdm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const isAdmin = user?.role === 'admin';

  const [enrollmentRecord, setEnrollmentRecord] = useState<EnrollmentRecord | null>(() => {
    if (isAdmin || !user) return null;
    const allSaved = localStorage.getItem('cdm_all_enrollments');
    if (allSaved) {
      const all: EnrollmentRecord[] = JSON.parse(allSaved);
      return all.find(r => r.id === user.username) || null;
    }
    return null;
  });

  useEffect(() => {
    if (!isAdmin && user) {
      const allSaved = localStorage.getItem('cdm_all_enrollments');
      if (allSaved) {
        const all: EnrollmentRecord[] = JSON.parse(allSaved);
        const mine = all.find(r => r.id === user.username);
        if (mine) setEnrollmentRecord(mine);
      }
    }
  }, [isAdmin, user]);

  const studentStatus = enrollmentRecord?.status || 'Validating';

  const toggleStatus = () => {
    if (!user) return;
    const nextStatus = studentStatus === 'Validating' ? 'Enrolled' : 'Validating';
    
    // Update local state
    const newRecord: EnrollmentRecord = enrollmentRecord ? {
      ...enrollmentRecord,
      status: nextStatus,
      studentInfo: {
        ...enrollmentRecord.studentInfo,
        studentId: nextStatus === 'Enrolled' ? '2026-00421' : '',
        section: nextStatus === 'Enrolled' ? 'BSIT - 1A' : ''
      }
    } : {
      id: user.username,
      studentInfo: { firstName: user.name, lastName: '', studentId: nextStatus === 'Enrolled' ? '2026-00421' : '', email: user.username + '@example.com' } as any,
      type: 'Regular',
      course: 'BSIT',
      yearLevel: '1st Year',
      status: nextStatus,
      enrolledAt: new Date().toISOString()
    };

    setEnrollmentRecord(newRecord);

    // Update global store
    const allSaved = localStorage.getItem('cdm_all_enrollments');
    let all: EnrollmentRecord[] = allSaved ? JSON.parse(allSaved) : [];
    const idx = all.findIndex(r => r.id === user.username);
    if (idx >= 0) all[idx] = newRecord;
    else all.push(newRecord);
    localStorage.setItem('cdm_all_enrollments', JSON.stringify(all));
  };

  return (
    <div className="space-y-8 text-left">
      {/* Simulation Toggle for Demo (Only visible in Student view) */}
      {!isAdmin && (
        <div className="flex justify-end">
          <button 
            onClick={toggleStatus}
            className="text-[10px] text-slate-400 hover:text-blue-500 font-bold uppercase tracking-widest flex items-center gap-1 group"
          >
            <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500" />
            Simulate {studentStatus === 'Validating' ? 'Approval' : 'Validation'}
          </button>
        </div>
      )}

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl text-white shadow-xl overflow-hidden relative",
          isAdmin ? "bg-linear-to-br from-[#1e293b] to-[#334155]" : "bg-linear-to-br from-[#064e3b] to-[#065f46]"
        )}
      >
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'User'}!</h2>
          <p className="text-sm opacity-90">
            {isAdmin 
              ? "The 1st Semester A.Y. 2026-2027 enrollment is currently active." 
              : "You are logged in to the CdM Student Portal. Stay updated with your academics."}
          </p>
        </div>
        <div className="bg-white/10 px-6 py-4 rounded-2xl text-center backdrop-blur-md border border-white/10 relative z-10">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Enrollment Phase</p>
          <p className="text-3xl font-black">{isAdmin ? "Phase 2" : "Active"}</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
      </motion.div>

      {isAdmin ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card glass className="p-5 flex flex-col justify-between h-full group hover:border-blue-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg text-white", stat.color.replace('text-', 'bg-'))}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {stat.trend}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
                    <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Enrollment Activity</CardTitle>
                    <CardDescription>Daily enrollment applications for the current week</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 font-semibold">View Details</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Notifications */}
            <div className="space-y-8">
              <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <CardHeader>
                  <CardTitle className="text-white text-left">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Generate Report', icon: TrendingUp },
                    { label: 'Manage Courses', icon: GraduationCap },
                    { label: 'Student Support', icon: Bell },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex items-center justify-between w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <action.icon className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 opacity-30" />
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-left">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-left">
                  <div className="divide-y divide-slate-100">
                    {MOCK_ENROLLMENTS.slice(0, 3).map((enrollment, i) => (
                      <div key={i} className="px-6 py-4 flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
                          {enrollment.studentInfo.firstName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">
                            {enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}
                          </p>
                          <p className="text-xs text-slate-500">Enrolled in {enrollment.course}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">2m ago</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-slate-100">
                    <Button variant="ghost" className="w-full text-slate-500 text-sm h-9">View All Activity</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Enrollments Table */}
          <Card glass className="overflow-hidden border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200/50">
              <div className="text-left">
                <CardTitle>Recent Enrollments</CardTitle>
                <CardDescription>Overview of the latest student applications</CardDescription>
              </div>
              <p className="text-xs font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/records')}>
                View All
              </p>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Year Level</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_ENROLLMENTS.map((enrollment, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors group text-left">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {enrollment.studentInfo.firstName ? enrollment.studentInfo.firstName[0] : 'U'}{enrollment.studentInfo.lastName ? enrollment.studentInfo.lastName[0] : 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}</p>
                            <p className="text-xs text-slate-500">{enrollment.studentInfo.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{enrollment.course}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{enrollment.studentInfo.yearLevel}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          enrollment.status === 'Enrolled' ? "bg-emerald-100 text-emerald-700" :
                          enrollment.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                          enrollment.status === 'Approved' ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {enrollment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">{enrollment.enrolledAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Student Dashboard Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card glass className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center",
                    user?.role === 'student' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  )}>
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Enrollment Status</h3>
                    <p className="text-xs text-slate-500">Academic Year 2026-2027</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-600">Current Status:</span>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                      studentStatus === 'Enrolled' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {studentStatus}
                    </span>
                  </div>
                  
                  {studentStatus === 'Enrolled' ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
                       <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Assigned Section:</span>
                        <span className="text-emerald-700 font-bold">{enrollmentRecord?.studentInfo.section || 'BSIT - 1A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Student ID:</span>
                        <span className="text-emerald-700 font-bold">{enrollmentRecord?.studentInfo.studentId || '2026-00421'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center">
                      Note: Your student ID and section will be visible once the registrar approves your enrollment.
                    </p>
                  )}

                  <Button 
                    className={cn(
                      "w-full",
                      studentStatus === 'Enrolled' ? "bg-blue-600 hover:bg-blue-700" : "bg-green-700 hover:bg-green-800"
                    )}
                    onClick={() => navigate('/enroll')}
                  >
                    {studentStatus === 'Enrolled' ? 'View Enrollment Form' : 'Update Information'}
                  </Button>
                </div>
              </Card>

              <Card glass className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Today's Schedule</h3>
                    <p className="text-xs text-slate-500">Wait for enrollment to view</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-center h-20 text-slate-300">
                    <Clock className="h-10 w-10 opacity-20" />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/scheduling')}>
                    View All Schedules
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Academic Information</CardTitle>
                <CardDescription>Important links and student resources</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Student Handbook', icon: BookOpen, desc: 'Rules and regulations' },
                  { label: 'Campus Map', icon: Users, desc: 'Find your classrooms' },
                  { label: 'Tuition Fees', icon: TrendingUp, desc: 'Billing information' },
                  { label: 'Support Center', icon: Bell, desc: 'Help and assistance' },
                ].map((info) => (
                  <div key={info.label} className="p-4 rounded-2xl border border-slate-100 hover:border-green-200 hover:bg-green-50/30 transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <info.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{info.label}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{info.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <CardHeader>
                <CardTitle className="text-green-900">Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white/60 rounded-2xl border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold text-green-800">Enrollment Period</span>
                  </div>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Enrollment for the first semester is open from May 1 to June 15, 2026. Please ensure your documents are complete.
                  </p>
                </div>
                <Button variant="ghost" className="w-full text-green-700 hover:bg-green-100">View More</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
               <div className="p-6 bg-[#064e3b] text-white">
                <h3 className="font-bold mb-1">Need help?</h3>
                <p className="text-xs opacity-80">Check the enrollment steps to guide you through the process.</p>
              </div>
              <CardContent className="p-6">
                <Button className="w-full" variant="outline" onClick={() => navigate('/steps')}>
                  View Enrollment Steps
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
