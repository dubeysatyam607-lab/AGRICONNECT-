import React, { useState, useEffect } from 'react';

/**
 * Enterprise Responsive Layout Manager.
 * Seamlessly adapts layout structure across Mobile (<640px), Tablet (640px - 1024px), and Desktop (>1024px).
 */

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface IResponsiveLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  bottomNav?: React.ReactNode;
  maxWidthClassName?: string;
}

export const ResponsiveLayout: React.FC<IResponsiveLayoutProps> = ({
  children,
  header,
  sidebar,
  bottomNav,
  maxWidthClassName = 'max-w-7xl',
}) => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors duration-300">
      {/* Top Header */}
      {header && (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClassName}`}>{header}</div>
        </header>
      )}

      {/* Main Container with optional Sidebar */}
      <div className={`flex-1 flex mx-auto w-full ${maxWidthClassName} px-4 sm:px-6 lg:px-8 py-6 gap-6`}>
        {/* Tablet/Desktop Sidebar */}
        {sidebar && breakpoint !== 'mobile' && (
          <aside className="w-64 flex-shrink-0 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto hidden sm:block border-r border-slate-200 dark:border-slate-800 pr-4">
            {sidebar}
          </aside>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 min-w-0 pb-20 sm:pb-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      {bottomNav && breakpoint === 'mobile' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 py-2 shadow-lg">
          {bottomNav}
        </nav>
      )}
    </div>
  );
};

/**
 * Hook to get current active device breakpoint
 */
export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('mobile');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};
