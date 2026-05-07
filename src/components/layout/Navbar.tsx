import { Bell, Search, User } from 'lucide-react';
import { User as UserType } from '@/src/types';

interface NavbarProps {
  user: UserType | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-30 h-[72px] border-b border-slate-200/20 bg-white/70 backdrop-blur-md px-8 flex items-center justify-between">
      <div className="relative w-96 hidden md:block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search students, courses or faculty..."
          className="w-full h-10 pl-11 pr-4 rounded-full border border-slate-200 bg-slate-900/5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">{user?.name || 'Guest'}</p>
            <p className="text-xs text-slate-500 mt-1 capitalize">{user?.role || 'User'}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/20">
            {user?.name?.[0] || <User className="h-5 w-5" />}
          </div>
        </div>
      </div>
    </nav>
  );
}
