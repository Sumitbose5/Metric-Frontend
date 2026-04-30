import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';

const ProtectedLayout: React.FC = () => {
  // Helper for active link styling
  const navItemStyles = ({ isActive }: { isActive: boolean }) => 
    `text-sm font-medium transition-all duration-200 ${
      isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4 md:px-12 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg flex items-center justify-center text-accent-foreground">
            <img src="https://res.cloudinary.com/dgxc8nspo/image/upload/v1769330002/logo2_ah607m.png" alt="Metric" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Metric</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-black border border-gray-300">
              BETA
            </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/dashboard" className={navItemStyles}>
            Dashboard
          </NavLink>
          <NavLink to="/interviews" className={navItemStyles}>
            Interviews
          </NavLink>
          <NavLink to="/feedback" className={navItemStyles}>
            Feedback
          </NavLink>
          <NavLink to="/settings" className={navItemStyles}>
            Settings
          </NavLink>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={() => window.dispatchEvent(new Event('open-beta-modal'))} className="hidden sm:flex h-10 px-5 items-center justify-center rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/20 transition-all cursor-pointer">
            Go Pro
          </button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          © 2024 Metric AI Platform. High-fidelity interview simulations.
        </p>
      </footer>
    </div>
  );
};

export default ProtectedLayout;
