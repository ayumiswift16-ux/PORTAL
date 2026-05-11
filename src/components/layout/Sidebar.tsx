import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut, GraduationCap } from 'lucide-react';
import { MENU_ITEMS } from './Sidebar.data';
import { cn } from '@/src/utils/cn';
import { User } from '@/src/types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  onItemClick?: () => void;
  className?: string;
  isEnrolled?: boolean;
}

export function Sidebar({ user, onLogout, onItemClick, className, isEnrolled }: SidebarProps) {
  const navigate = useNavigate();

  const filteredItems = MENU_ITEMS.filter(item => {
    const hasRole = !item.roles || (user && item.roles.includes(user.role));
    if (!hasRole) return false;
    
    // Students must be enrolled to see items marked with requiresEnrollment
    if (user?.role === 'student' && (item as any).requiresEnrollment && !isEnrolled) {
      return false;
    }
    
    return true;
  });

  return (
    <aside className={cn(
      "bg-[#051c14] text-slate-400 border-r border-white/5 flex flex-col h-full",
      className
    )}>
      {/* Header / Branding */}
      <div className="p-8 pb-4 flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <img 
            src={`${import.meta.env.BASE_URL}cdm-logo.png`} 
            alt="CdM Logo" 
            className="h-12 w-12 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
          />
        </div>
        <div className="flex flex-col text-left relative z-10">
          <span className="text-white font-black tracking-tight text-lg leading-none uppercase italic">CdM</span>
          <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.3em] mt-0.5 whitespace-nowrap">Portal System</span>
        </div>
      </div>

      <div className="mt-8 px-6 pb-4">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-900/50 to-transparent" />
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        <p className="px-5 pb-3 text-[10px] font-black text-slate-500/50 uppercase tracking-[0.25em] text-left">Operations</p>
        
        <div className="space-y-1.5">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "text-white" 
                  : "text-slate-500 hover:text-emerald-200"
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Background Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-pill"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 shadow-[0_4px_15px_rgba(5,150,105,0.3)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  
                  {/* Hover effect for non-active */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}

                  <item.icon className={cn(
                    "h-5 w-5 relative z-10 transition-all duration-300",
                    isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-emerald-400 group-hover:scale-105"
                  )} />
                  <span className={cn(
                    "text-[13px] relative z-10 tracking-tight",
                    isActive ? "font-bold text-white" : "font-medium text-slate-400 group-hover:text-white"
                  )}>
                    {item.label}
                  </span>

                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full mr-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-6 mt-auto">
        <button
          onClick={onLogout}
          className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-300 group border border-transparent hover:border-emerald-500/20"
        >
          <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-[11px] uppercase tracking-widest">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
