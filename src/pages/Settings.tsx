import { useState } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import toast from 'react-hot-toast';

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

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
                  { label: 'Account Security', icon: Shield, active: false },
                  { label: 'Notifications', icon: Bell, active: false },
                  { label: 'Appearance', icon: Moon, active: false },
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

          <Button variant="danger" className="w-full gap-2 py-6">
            <LogOut className="h-4 w-4" />
            Logout from Portal
          </Button>
        </div>

        {/* Settings Forms */}
        <div className="md:col-span-2 space-y-8">
          <Card glass className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <School className="h-5 w-5 text-blue-600" />
                <CardTitle>School Information</CardTitle>
              </div>
              <CardDescription>Update identity details for Collegio de Montalban.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Institution Name" defaultValue="Collegio de Montalban" />
                <Input label="Academic Year" defaultValue="2026-2027" />
              </div>
              <Input label="Office Address" defaultValue="Kasiglahan Village, Rodriguez, Rizal" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input label="Official Email" className="pl-10" defaultValue="info@cdm.edu.ph" />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-[42px] -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input label="Website URL" className="pl-10" defaultValue="www.cdm.edu.ph" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card glass className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-indigo-600" />
                <CardTitle>Administrative Account</CardTitle>
              </div>
              <CardDescription>Configure your login credentials and personal data.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Admin Username" defaultValue="admin" disabled />
                <Input label="Full Name" defaultValue="System Administrator" />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${notifications ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Email Notifications</p>
                    <p className="text-xs text-slate-500">Receive alerts about new enrollments.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-all relative ${notifications ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Moon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Dark Interface</p>
                    <p className="text-xs text-slate-500">Toggle the portal aesthetic (Beta).</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-indigo-900' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 translate-y-[-10px]">
            <Button variant="ghost">Discard Changes</Button>
            <Button onClick={handleSave} size="lg" className="px-10">Save Configuration</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
