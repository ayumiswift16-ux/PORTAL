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
  Plus
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

const STATS = [
  { label: 'Total Students', value: '1,284', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', trend: '+12.5%' },
  { label: 'Active Enrollees', value: '842', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100', trend: '+8.2%' },
  { label: 'Approved', value: '756', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: '+14.1%' },
  { label: 'Pending Apps', value: '86', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', trend: '-2.4%' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-2xl bg-linear-to-br from-[#1e293b] to-[#334155] text-white shadow-xl"
      >
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome back, Registrar!</h2>
          <p className="text-sm opacity-90">The 1st Semester A.Y. 2026-2027 enrollment is currently active.</p>
        </div>
        <div className="bg-white/10 px-5 py-3 rounded-xl text-center backdrop-blur-sm border border-white/10">
          <p className="text-[10px] uppercase tracking-widest opacity-70">Days Remaining</p>
          <p className="text-3xl font-black">14</p>
        </div>
      </motion.div>

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
              <CardTitle className="text-white">Quick Actions</CardTitle>
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
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
          <div>
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
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {enrollment.studentInfo.firstName[0]}{enrollment.studentInfo.lastName[0]}
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
    </div>
  );
}
