import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { MOCK_ENROLLMENTS } from '@/src/mockData';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';

export default function Records() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const navigate = useNavigate();

  const filteredEnrollments = useMemo(() => {
    return MOCK_ENROLLMENTS.filter(enrollment => {
      const matchesSearch = (
        enrollment.studentInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.studentInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.studentInfo.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesCourse = filterCourse === 'All' || enrollment.course === filterCourse;
      return matchesSearch && matchesCourse;
    });
  }, [searchTerm, filterCourse]);

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
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSBA">BSBA</option>
                  <option value="BSED">BSED</option>
                  <option value="Criminology">Criminology</option>
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
                        <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                          {enrollment.studentInfo.firstName[0]}{enrollment.studentInfo.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {enrollment.studentInfo.firstName} {enrollment.studentInfo.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{enrollment.studentInfo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{enrollment.course}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{enrollment.yearLevel}</p>
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
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
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
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredEnrollments.length}</span> out of <span className="font-bold text-slate-900">{MOCK_ENROLLMENTS.length}</span> students
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
    </div>
  );
}
