import { Bell, Search, User, Menu, X, Check, Info, AlertTriangle, AlertCircle, Clock, Settings, LogOut, Camera, Mail, Phone, MapPin, Shield, Calendar, IdCard, Flag, Send } from 'lucide-react';
import { User as UserType, Notification } from '@/src/types';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/src/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface NavbarProps {
  user: UserType | null;
  onMenuClick?: () => void;
  onLogout?: () => void;
  onShowProfile?: () => void;
  onShowReport?: () => void;
}

export function Navbar({ user, onMenuClick, onLogout, onShowProfile, onShowReport }: NavbarProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);


  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    // Use a simple query first to avoid permission/index issues
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.username)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Notification[];
      // Sort in memory to avoid index requirements
      setNotifications(notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      console.error("Firestore Error in Navbar:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4 text-emerald-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50';
      case 'warning': return 'bg-amber-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-blue-50';
    }
  };

  return (
    <nav className="sticky top-0 z-50 h-[72px] border-b border-slate-200/20 bg-white/70 backdrop-blur-md px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="relative w-72 lg:w-96 hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students, courses..."
            className="w-full h-10 pl-11 pr-4 rounded-full border border-slate-200 bg-slate-900/5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {user?.role === 'student' && (
          <button 
            onClick={onShowReport}
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
            title="Report an issue"
          >
            <Flag className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Report</span>
          </button>
        )}

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={cn(
              "relative p-2 hover:bg-slate-100 rounded-xl transition-colors",
              isNotifOpen ? "bg-slate-100 text-blue-600" : "text-slate-500"
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded-full uppercase tracking-widest">{unreadCount} New</span>}
                  </h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "p-4 hover:bg-slate-50 transition-all cursor-pointer flex gap-4 relative group",
                          !notif.read && "bg-blue-50/30"
                        )}
                      >
                        {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", getBg(notif.type))}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn("text-sm font-bold truncate", notif.read ? "text-slate-700" : "text-slate-900")}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className={cn("text-xs mt-1 leading-relaxed", notif.read ? "text-slate-500" : "text-slate-600")}>
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="h-8 w-8 text-slate-200" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">No notifications yet</p>
                      <p className="text-xs text-slate-500 mt-1">We'll notify you when there's an update to your account.</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                      View all activities
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-1 md:mx-2" />

        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              if (user?.role === 'admin') {
                navigate('/settings');
              } else {
                setIsProfileOpen(!isProfileOpen);
              }
            }}
            className={cn(
              "flex items-center gap-3 p-1 rounded-xl transition-all duration-200 hover:bg-slate-50 group",
              isProfileOpen && "bg-slate-100"
            )}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                {user?.name || 'Guest'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {user?.role || 'User'}
              </p>
            </div>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative group-hover:scale-105 transition-transform duration-300",
              user?.profilePicture ? "bg-slate-100" : "bg-blue-600 shadow-blue-600/20"
            )}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || <User className="h-5 w-5" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      onShowProfile?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group"
                  >
                    <User className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                    My Profile
                  </button>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group"
                  >
                    <Settings className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                    Account Settings
                  </button>
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all group"
                  >
                    <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-600" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </nav>
  );
}
