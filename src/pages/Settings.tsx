import { useState, useEffect } from 'react';
import { 
  User, 
  School, 
  Bell, 
  Moon, 
  LogOut, 
  Shield, 
  Smartphone,
  Globe,
  Camera,
  Mail,
  GraduationCap,
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import toast from 'react-hot-toast';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SystemSettings } from '@/src/types';

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollmentSettings, setEnrollmentSettings] = useState<SystemSettings>({
    academicYear: '2025-2026',
    semester: '1',
    enrollmentStartDate: '',
    enrollmentEndDate: ''
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'enrollment');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEnrollmentSettings(docSnap.data() as SystemSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'enrollment'), enrollmentSettings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h2>
          <p className="text-slate-500 mt-1">Manage portal configuration and administrative preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Navigation */}
        <div className="space-y-4">
          <Card glass className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 text-center border-b border-slate-200/50">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-600/20">
                    AD
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-white rounded-xl shadow-md border border-slate-100 text-slate-600 hover:text-blue-600 transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-slate-900">Administrator</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Main Office</p>
              </div>
              <div className="p-4 space-y-1">
                {[
                  { label: 'General', icon: Smartphone, active: true },
                  { label: 'Enrollment Schedule', icon: Calendar, active: false },
                  { label: 'Account Security', icon: Shield, active: false },
                  { label: 'Notifications', icon: Bell, active: false },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      item.active ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Forms */}
        <div className="md:col-span-2 space-y-8">
          <Card glass className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-5 w-5 text-blue-600" />
                <CardTitle>Enrollment Period</CardTitle>
              </div>
              <CardDescription>Configure when students can access the enrollment portal.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Academic Year" 
                  value={enrollmentSettings.academicYear} 
                  onChange={(e) => setEnrollmentSettings({...enrollmentSettings, academicYear: e.target.value})}
                />
                <Input 
                  label="Semester" 
                  value={enrollmentSettings.semester} 
                  onChange={(e) => setEnrollmentSettings({...enrollmentSettings, semester: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Enrollment Start Date & Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="datetime-local" 
                      className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                      value={enrollmentSettings.enrollmentStartDate}
                      onChange={(e) => setEnrollmentSettings({...enrollmentSettings, enrollmentStartDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Enrollment End Date & Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="datetime-local" 
                      className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                      value={enrollmentSettings.enrollmentEndDate}
                      onChange={(e) => setEnrollmentSettings({...enrollmentSettings, enrollmentEndDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Important</p>
                  <p className="text-xs text-blue-700 leading-relaxed">The enrollment button will be visible to students only during this specified period. Ensure the local system time matches the server time.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card glass className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <School className="h-5 w-5 text-blue-600" />
                <CardTitle>School Information</CardTitle>
              </div>
              <CardDescription>Update identity details for Collegio de Montalban.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-left">
              <Input label="Institution Name" defaultValue="Colegio de Montalban" />
              <Input label="Office Address" defaultValue="Kasiglahan Village, San Jose, Rodriguez, Rizal" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input label="Official Email" className="pl-10" defaultValue="info@cdm.edu.ph" />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input label="Website URL" className="pl-10" defaultValue="www.pnm.edu.ph" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 translate-y-[-10px]">
            <Button variant="ghost">Discard Changes</Button>
            <Button onClick={handleSave} size="lg" className="px-10 bg-[#064e3b] hover:bg-[#053d2e]">Save Configuration</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
