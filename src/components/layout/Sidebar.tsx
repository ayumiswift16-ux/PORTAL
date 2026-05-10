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
}

export function Sidebar({ user, onLogout, onItemClick, className }: SidebarProps) {
  const navigate = useNavigate();

  const filteredItems = MENU_ITEMS.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className={cn(
      "bg-[#0f172a] text-slate-400 border-r border-slate-800 flex flex-col h-full",
      className
    )}>
      <div className="p-6 flex items-center gap-3 mb-10">
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
          CdM
        </div>
        <div className="flex flex-col text-left">
          <span className="text-white font-bold tracking-tight text-base leading-tight">Colegio de</span>
          <span className="text-sm font-normal text-slate-400">Montalban</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-2 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-left">Main Menu</p>
        
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
              isActive 
                ? "bg-blue-600/10 text-white" 
                : "hover:bg-white/5 hover:text-slate-100"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300"
                )} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
