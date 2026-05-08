import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, BookOpen, User, MapPin, AlertCircle, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { Day, ScheduleItem, Section, YearLevel } from '../types';
import { toast } from 'react-hot-toast';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Scheduling() {
  const [sections, setSections] = useState<Section[]>(() => {
    const saved = localStorage.getItem('cdm_sections');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: Section) => s && typeof s === 'object' && s.name && s.name.trim() !== '');
        }
      } catch (e) {
        console.error("Error parsing sections", e);
      }
    }
    return [
      { name: 'BSIT-1A', yearLevel: '1st Year' },
      { name: 'BSIT-1B', yearLevel: '1st Year' },
      { name: 'BSIT-1C', yearLevel: '1st Year' },
      { name: 'BSIT-1D', yearLevel: '1st Year' },
    ];
  });
  const [selectedSection, setSelectedSection] = useState(sections[0]?.name || '');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingSections, setIsManagingSections] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionYear, setNewSectionYear] = useState<YearLevel>('1st Year');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedSchedules = localStorage.getItem('cdm_schedules');
    if (savedSchedules) {
      setSchedules(JSON.parse(savedSchedules));
    }
  }, []);

  const saveSchedules = (newSchedules: ScheduleItem[]) => {
    setSchedules(newSchedules);
    localStorage.setItem('cdm_schedules', JSON.stringify(newSchedules));
  };

  const saveSections = (newSections: Section[]) => {
    const cleaned = newSections.filter(s => s && s.name && s.name.trim() !== '');
    setSections(cleaned);
    localStorage.setItem('cdm_sections', JSON.stringify(cleaned));
  };

  const addSection = () => {
    if (!newSectionName.trim()) return;
    const name = newSectionName.trim().toUpperCase();
    if (sections.some(s => s.name === name)) {
      toast.error('Section already exists');
      return;
    }
    const updated = [...sections, { name, yearLevel: newSectionYear }];
    saveSections(updated);
    setNewSectionName('');
    toast.success('Section added');
  };

  const removeSection = (name: string) => {
    const updated = sections.filter(s => s.name !== name);
    saveSections(updated);
    if (selectedSection === name) setSelectedSection(updated[0]?.name || '');
    toast.success('Section removed');
  };

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    day: 'Monday' as Day,
    startTime: '08:00',
    endTime: '09:00',
    instructor: '',
    room: '',
  });

  const checkConflict = (day: Day, start: string, end: string, section: string, excludeId?: string) => {
    return schedules.some(item => {
      if (item.id === excludeId) return false;
      if (item.day !== day) return false;
      if (item.section !== section) return false;

      const newStart = parseInt(start.replace(':', ''));
      const newEnd = parseInt(end.replace(':', ''));
      const itemStart = parseInt(item.startTime.replace(':', ''));
      const itemEnd = parseInt(item.endTime.replace(':', ''));

      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      return (newStart < itemEnd) && (newEnd > itemStart);
    });
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time');
      return;
    }

    if (checkConflict(formData.day, formData.startTime, formData.endTime, selectedSection)) {
      toast.error('This time slot overlaps with an existing schedule for this section!');
      return;
    }

    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      section: selectedSection,
      ...formData,
    };

    saveSchedules([...schedules, newItem]);
    setIsAdding(false);
    setFormData({
      subject: '',
      day: formData.day,
      startTime: '08:00',
      endTime: '09:00',
      instructor: '',
      room: '',
    });
    toast.success('Schedule added successfully!');
  };

  const removeSchedule = (id: string) => {
    saveSchedules(schedules.filter(s => s.id !== id));
    toast.success('Schedule removed');
  };

  const getSectionSchedules = () => {
    return schedules.filter(s => s.section === selectedSection)
      .sort((a, b) => {
        const dayOrder = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        if (dayOrder !== 0) return dayOrder;
        return a.startTime.localeCompare(b.startTime);
      });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Class Scheduling</h1>
          <p className="text-slate-500 mt-1">Manage weekly subject schedules for all sections.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setIsManagingSections(true)} 
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Sections
          </Button>
          <Button 
            onClick={() => setIsAdding(true)} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Schedule
          </Button>
        </div>
      </div>

      {/* Section Dropdown Selector */}
      <div className="relative z-20 mb-8 max-w-xs">
        <button
          onClick={() => setIsSectionOpen(!isSectionOpen)}
          className="flex items-center justify-between w-full px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-400 transition-all text-black font-bold"
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            {selectedSection || 'Select Section'}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isSectionOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isSectionOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden py-2"
            >
              {sections.filter(s => s.name).map(section => (
                <button
                  key={section.name}
                  onClick={() => {
                    setSelectedSection(section.name);
                    setIsSectionOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-6 py-3 text-sm transition-colors border-b last:border-0 border-slate-50",
                    selectedSection === section.name 
                      ? "bg-blue-600 text-white font-bold" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="text-black">{section.name}</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase",
                    selectedSection === section.name ? "text-white" : "text-slate-500"
                  )}>{section.yearLevel}</span>
                </button>
              ))}
              {sections.length === 0 && (
                <div className="px-6 py-4 text-sm text-slate-400">No sections added yet.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DAYS.map(day => {
          const dayItems = getSectionSchedules().filter(s => s.day === day);
          return (
            <Card key={day} glass className="border-none shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-black" />
                  <CardTitle className="text-lg font-black text-black uppercase tracking-tight leading-none">{day}</CardTitle>
                </div>
                <span className="text-[10px] font-bold text-black uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                  {dayItems.length} Classes
                </span>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                {dayItems.length > 0 ? (
                  <div className="space-y-4">
                    {dayItems.map(item => (
                      <div key={item.id} className="group relative bg-white rounded-xl p-4 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                        <button 
                          onClick={() => removeSchedule(item.id)}
                          className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-none">{item.subject}</h4>
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-slate-500">
                              <Clock className="h-3 w-3" />
                              {item.startTime} - {item.endTime}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <User className="h-3 w-3" />
                            <span className="truncate">{item.instructor}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{item.room}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs font-medium">No classes scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rest Day Indicator */}
      <div className="mt-8">
        <Card className="bg-slate-50/50 border-slate-200 border-dashed">
          <CardContent className="p-6 flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-900">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-black">Sunday - Rest Day</h3>
              <p className="text-sm text-slate-600">No classes are permitted on Sundays in the system.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage Sections Modal */}
      <AnimatePresence>
        {isManagingSections && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagingSections(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Manage Sections</h3>
                  <p className="text-xs text-slate-500">Add or remove academic sections</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Settings className="h-5 w-5" />
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Add New Section */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g. BSIT-1A"
                      value={newSectionName}
                      onChange={e => setNewSectionName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSection()}
                    />
                    <select
                      className="flex h-11 w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newSectionYear}
                      onChange={e => setNewSectionYear(e.target.value as YearLevel)}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <Button onClick={addSection} className="w-full h-11">Add Section</Button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Current Sections</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {sections.filter(s => s && s.name && s.name.trim() !== '').map(section => (
                      <div key={section.id || section.name} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 group shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-black leading-tight">{section.name}</span>
                          <span className="text-[10px] text-slate-800 font-bold uppercase tracking-tight">{section.yearLevel}</span>
                        </div>
                        <button 
                          onClick={() => removeSection(section.name)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {sections.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-400">No sections found.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex justify-end">
                <Button onClick={() => setIsManagingSections(false)}>Done</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleAddSchedule}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Schedule Class</h3>
                    <p className="text-xs text-slate-500">Add subject to {selectedSection}</p>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <Input 
                    label="Subject Name" 
                    placeholder="e.g. Data Structures"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Day of Week</label>
                      <select 
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.day}
                        onChange={e => setFormData({ ...formData, day: e.target.value as Day })}
                      >
                        {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Room</label>
                      <Input 
                        placeholder="e.g. Lab 304"
                        value={formData.room}
                        onChange={e => setFormData({ ...formData, room: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Start Time" 
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    />
                    <Input 
                      label="End Time" 
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>

                  <Input 
                    label="Instructor Name" 
                    placeholder="e.g. Prof. Dela Cruz"
                    value={formData.instructor}
                    onChange={e => setFormData({ ...formData, instructor: e.target.value })}
                  />

                  <div className="bg-amber-50 p-4 rounded-2xl flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <p className="text-[10px] font-medium text-amber-700">
                      The system will automatically prevent overlapping schedules for {selectedSection} on this day.
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                  >
                    Confirm Schedule
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
