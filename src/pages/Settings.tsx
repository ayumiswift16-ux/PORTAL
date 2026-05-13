import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  User as UserIcon, 
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
  Info,
  Check,
  Save,
  Users,
  Search,
  Plus,
  Trash2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import toast from 'react-hot-toast';
import { db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { SystemSettings, User as UserType, Section } from '@/src/types';
import { cn } from '@/src/utils/cn';

interface SettingsProps {
  user: UserType;
}

type TabType = 'General' | 'Enrollment Schedule' | 'Professor Management' | 'Account Security' | 'Notifications';

export default function Settings({ user }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [enrollmentSettings, setEnrollmentSettings] = useState<SystemSettings>({
    academicYear: '2025-2026',
    semester: '1',
    enrollmentStartDate: '',
    enrollmentEndDate: ''
  });

  const [professors, setProfessors] = useState<UserType[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isAddingProfessor, setIsAddingProfessor] = useState(false);
  const [newProfessorEmail, setNewProfessorEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'enrollment');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEnrollmentSettings(docSnap.data() as SystemSettings);
        }

        if (user.role === 'admin') {
          // Fetch Professors from users collection
          const profsQuery = query(collection(db, 'users'), where('role', '==', 'professor'));
          const profsSnap = await getDocs(profsQuery);
          const profsData = profsSnap.docs.map(doc => ({ ...doc.data() }) as UserType);
          
          // Also fetch from admins collection to find those who haven't logged in yet
          const adminsSnap = await getDocs(collection(db, 'admins'));
          const adminsData = adminsSnap.docs.map(doc => ({
            username: doc.id,
            email: doc.id,
            name: doc.data().name || doc.id.split('@')[0],
            role: 'professor',
            assignedSections: doc.data().assignedSections || [],
            assignedSection: doc.data().assignedSection || null
          }) as UserType);

          // Merge: prioritize users collection for actual logged in profs
          const merged = [...profsData];
          adminsData.forEach(admin => {
             if (!merged.find(p => p.email === admin.email)) {
               merged.push(admin);
             }
          });
          setProfessors(merged);

          // Fetch Sections for assignment
          const sectionsSnap = await getDocs(collection(db, 'sections'));
          setSections(sectionsSnap.docs.map(doc => doc.data() as Section));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [user.role]);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'enrollment'), enrollmentSettings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.username), {
        name: profileData.name
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddProfessor = async () => {
    if (!newProfessorEmail.includes('@')) {
      toast.error("Invalid email address");
      return;
    }
    try {
      // Create record in admins collection for pre-authorization
      const profId = newProfessorEmail.trim();
      await setDoc(doc(db, 'admins', profId), {
        email: profId,
        name: profId.split('@')[0],
        role: 'professor',
        assignedSections: [],
        createdAt: new Date().toISOString()
      });
      
      setProfessors(prev => [...prev, {
        username: profId,
        email: profId,
        name: profId.split('@')[0],
        role: 'professor',
        assignedSections: []
      } as UserType]);
      
      setNewProfessorEmail('');
      setIsAddingProfessor(false);
      toast.success("Professor added successfully");
    } catch (error) {
      toast.error("Failed to add professor");
    }
  };

  const handleRemoveProfessor = async (email: string) => {
    if (!confirm(`Remove ${email} as professor?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', email));
      // Also potentially update their user role back to student or delete, 
      // but usually removing from admins is enough to revoke prof access in App.tsx
      setProfessors(prev => prev.filter(p => p.email !== email));
      toast.success("Professor removed");
    } catch (error) {
      toast.error("Failed to remove professor");
    }
  };

  const handleToggleSection = async (profEmail: string, sectionName: string) => {
    const prof = professors.find(p => p.email === profEmail);
    if (!prof) return;

    const currentSections = prof.assignedSections || [];
    const isAssigned = currentSections.includes(sectionName);
    
    let updatedSections: string[];
    if (isAssigned) {
      updatedSections = currentSections.filter(s => s !== sectionName);
    } else {
      updatedSections = [...currentSections, sectionName];
    }

    try {
      // Update both admins (pre-auth) and users (live doc) if possible
      const updateData = {
        assignedSections: updatedSections,
        assignedSection: updatedSections[0] || null,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'admins', profEmail), updateData);
      
      // Try to find the user in 'users' collection too (since their ID might be different from email)
      // but we use email as ID in admins. App.tsx handles the sync when they login.
      
      setProfessors(prev => prev.map(p => p.email === profEmail ? { ...p, ...updateData } : p));
      toast.success(isAssigned ? "Section removed" : "Section assigned");
    } catch (error) {
      console.error("Error toggling section:", error);
      toast.error("Failed to update section");
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
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">System Settings</h2>
          <p className="text-slate-500 mt-2 font-medium">Manage portal configuration and administrative preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card glass className="border-none shadow-sm overflow-hidden rounded-[2rem]">
            <CardContent className="p-0">
              <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
                <div className="relative inline-block mb-6">
                  <div className={cn(
                    "h-28 w-28 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-2xl relative overflow-hidden group transition-transform hover:scale-105",
                    user.profilePicture ? "bg-white" : "bg-blue-600 shadow-blue-600/20 text-white"
                  )}>
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.name?.[0]
                    )}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
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
                  />
                </div>
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">{user.name}</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] mt-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block">
                  {user.role === 'admin' ? 'Registrar' : 'Student'}
                </p>
              </div>
              <div className="p-4 space-y-1">
                {[
                  { label: 'General', icon: Smartphone },
                  { label: 'Enrollment Schedule', icon: Calendar },
                  ...(user.role === 'admin' ? [{ label: 'Professor Management', icon: Users }] : []),
                  { label: 'Account Security', icon: Shield },
                  { label: 'Notifications', icon: Bell },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.label as TabType)}
                    className={cn(
                      "flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
                      activeTab === item.label ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", activeTab === item.label ? "text-white" : "text-slate-400")} />
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card glass className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest">Portal Access</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
                You are currently signed in with administrator privileges. Ensure all sensitive configurations are verified.
              </p>
              <Button 
                variant="outline" 
                className="w-full border-slate-700 hover:bg-white/10 text-white rounded-xl h-12 text-[10px] font-bold uppercase tracking-widest"
              >
                Sign Out Everywhere
              </Button>
            </div>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {activeTab === 'General' && (
            <>
              {/* Profile Information */}
              <Card glass className="border-none shadow-sm rounded-[2rem]">
                <CardHeader className="border-b border-slate-50 p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                  </div>
                  <CardDescription>Update your personal details and how others see you.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 text-left">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                        <Input 
                          placeholder="Full Name" 
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          className="rounded-2xl bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            value={profileData.email}
                            disabled
                            className="rounded-2xl bg-slate-50 border-slate-100 pl-11 text-slate-400 italic"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 px-1 mt-1 font-medium">To change your email, please contact IT support.</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSavingProfile || profileData.name === user.name}
                        className="bg-blue-600 hover:bg-blue-700 px-8 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest flex gap-2"
                      >
                        {isSavingProfile ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Profile Updates
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* School Information */}
              <Card glass className="border-none shadow-sm rounded-[2rem]">
                <CardHeader className="border-b border-slate-50 p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <School className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">School Information</CardTitle>
                  </div>
                  <CardDescription>Update identity details for the institution.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Institution Name</label>
                    <Input className="rounded-2xl border-slate-200" defaultValue="Colegio de Montalban" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Official Address</label>
                    <Input className="rounded-2xl border-slate-200" defaultValue="Kasiglahan Village, San Jose, Rodriguez, Rizal" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Office Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input className="rounded-2xl border-slate-200 pl-11" defaultValue="info@cdm.edu.ph" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Website URL</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input className="rounded-2xl border-slate-200 pl-11" defaultValue="www.cdm.edu.ph" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'Enrollment Schedule' && (
            <Card glass className="border-none shadow-sm rounded-[2rem]">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Enrollment Period</CardTitle>
                </div>
                <CardDescription>Configure when students can access the enrollment portal.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Academic Year</label>
                    <Input 
                      value={enrollmentSettings.academicYear} 
                      onChange={(e) => setEnrollmentSettings({...enrollmentSettings, academicYear: e.target.value})}
                      className="rounded-2xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Semester</label>
                    <Input 
                      value={enrollmentSettings.semester} 
                      onChange={(e) => setEnrollmentSettings({...enrollmentSettings, semester: e.target.value})}
                      className="rounded-2xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Enrollment Start Date & Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="datetime-local" 
                        className="w-full pl-11 pr-4 h-12 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-bold"
                        value={enrollmentSettings.enrollmentStartDate}
                        onChange={(e) => setEnrollmentSettings({...enrollmentSettings, enrollmentStartDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Enrollment End Date & Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="datetime-local" 
                        className="w-full pl-11 pr-4 h-12 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-bold"
                        value={enrollmentSettings.enrollmentEndDate}
                        onChange={(e) => setEnrollmentSettings({...enrollmentSettings, enrollmentEndDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                  <Info className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Important</p>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">The enrollment button will be visible to students only during this specified period. Ensure the local system time matches the server time.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveSettings} 
                    className="bg-[#064e3b] hover:bg-[#053d2e] px-10 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest flex gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Professor Management' && user.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-slate-900">Professor Access Control</h3>
                  <p className="text-sm text-slate-500">Assign academic sections to professors for portal management.</p>
                </div>
                <Button 
                  onClick={() => setIsAddingProfessor(true)}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest h-12 px-6"
                >
                  <Plus className="h-4 w-4" />
                  Add Professor
                </Button>
              </div>

              <Card glass className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search professor by name or email..."
                      className="pl-10 h-10 bg-white border-slate-200 text-sm rounded-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor Details</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Sections</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {professors
                        .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((prof) => (
                        <tr key={prof.email} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm uppercase">
                                {(prof.name || 'P')[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{prof.name}</p>
                                <p className="text-xs text-slate-500">{prof.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {(prof.assignedSections || []).map(s => (
                                <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 flex items-center gap-1">
                                  {s}
                                  <button onClick={() => handleToggleSection(prof.email, s)} className="hover:text-red-600 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                              <div className="relative group/menu">
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-bold border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                                  <Plus className="h-3 w-3 mr-1" /> Assign
                                </Button>
                                <div className="absolute top-full left-0 mt-2 hidden group-hover/menu:block z-50 bg-white shadow-2xl border border-slate-100 rounded-2xl p-2 min-w-[220px] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                  <p className="text-[10px] font-black text-slate-400 uppercase px-3 py-2 mb-1 border-b border-slate-50">Select Section</p>
                                  {sections
                                    .filter(s => !(prof.assignedSections || []).includes(s.name))
                                    .map(section => (
                                    <button
                                      key={section.name}
                                      onClick={() => handleToggleSection(prof.email, section.name)}
                                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 rounded-xl font-medium text-slate-700 flex justify-between items-center transition-colors"
                                    >
                                      {section.name}
                                      <span className="text-[9px] font-bold text-slate-300 group-hover:text-blue-400 uppercase">{section.yearLevel}</span>
                                    </button>
                                  ))}
                                  {sections.length === 0 && (
                                    <p className="px-3 py-4 text-[10px] text-slate-400 italic text-center">No sections created yet.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <button 
                              onClick={() => handleRemoveProfessor(prof.email)}
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {professors.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-24 text-center text-slate-400">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Users className="h-10 w-10 opacity-20" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">No Professors Registered</p>
                            <p className="text-xs mt-1">Start by adding a professor's email to authorize them.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {isAddingProfessor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
                  <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 text-left">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-8">
                       <Plus className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Add Professor</h3>
                    <p className="text-sm text-slate-500 mb-8 font-medium">This will authorize the Gmail account to access the Professor Portal. They must login using this exact email.</p>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gmail Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input 
                            placeholder="e.g., professor@gmail.com" 
                            className="pl-12 rounded-2xl h-14 bg-slate-50 border-slate-100 font-medium"
                            value={newProfessorEmail}
                            onChange={(e) => setNewProfessorEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-bold text-slate-500" onClick={() => setIsAddingProfessor(false)}>Cancel</Button>
                        <Button className="flex-1 rounded-2xl h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 font-black uppercase text-[10px] tracking-widest" onClick={handleAddProfessor}>Add Professor</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Account Security' && (
            <Card glass className="border-none shadow-sm rounded-[2rem]">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    < Shield className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Security & MFA</CardTitle>
                </div>
                <CardDescription>Manage your account security and authentication methods.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <Shield className="h-10 w-10 text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-2">Advanced Security Settings</p>
                <p className="text-xs text-slate-500 max-w-sm font-medium">Security settings are managed by the institution. Contact the IT department to enable Multi-Factor Authentication.</p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Notifications' && (
            <Card glass className="border-none shadow-sm rounded-[2rem]">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Bell className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                </div>
                <CardDescription>Control which updates you receive through the portal.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {[
                  { title: 'New Admissions', desc: 'Notify when a new enrollment application is submitted.', checked: true },
                  { title: 'System Updates', desc: 'Receive updates about portal maintenance and new features.', checked: true },
                  { title: 'Student Reports', desc: 'Get alerts when students report technical issues.', checked: true },
                  { title: 'Email Digests', desc: 'Weekly summary of institution activities.', checked: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
                    </div>
                    <div className={cn(
                      "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                      item.checked ? "bg-blue-600" : "bg-slate-200"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                        item.checked ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
