import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BackgroundBlobs } from './BackgroundBlobs';
import { User } from '@/src/types';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MainLayoutProps {
  children: ReactNode;
  user: User | null;
  onLogout: () => void;
}

export function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:p-0">
      <div className="no-print">
        <BackgroundBlobs />
      </div>
      
      {/* PC Sidebar */}
      <div className="no-print">
        <Sidebar 
          user={user} 
          onLogout={onLogout} 
          className="fixed left-0 top-0 bottom-0 w-[240px] z-40 hidden lg:flex"
        />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="no-print flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-slate-950 z-50 lg:hidden flex flex-col"
            >
              <Sidebar 
                user={user} 
                onLogout={onLogout} 
                onItemClick={() => setIsMobileMenuOpen(false)}
                className="border-none"
              />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-[-48px] bg-slate-950 text-white p-2 rounded-r-xl"
              >
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[240px] flex flex-col min-h-screen bg-glass-gradient print:pl-0 print:bg-white print:m-0">
        <div className="no-print">
          <Navbar user={user} />
        </div>
        
        {/* Mobile menu toggle */}
        <div className="lg:hidden p-4 bg-white border-b border-slate-200 no-print">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center gap-2 text-slate-600 font-medium"
          >
            <Menu className="h-6 w-6" />
            <span>Menu</span>
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden print:p-0 print:m-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
