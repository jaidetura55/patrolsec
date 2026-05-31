import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Theme } from '../types';

interface LandingPageProps {
  theme: Theme;
}

export const LandingPage: React.FC<LandingPageProps> = ({ theme }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // We need to reach 100% in 5 seconds (5000ms)
    // Update every 100ms for smoothness
    const intervalTime = 100;
    const steps = 5000 / intervalTime;
    const increment = 100 / steps;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-white';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const subTextColor = theme === 'black' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`flex flex-col items-center justify-between h-full w-full p-8 ${bgColor} ${textColor}`}>
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full max-w-md">
        {/* Logo Section */}
        <div className="relative mb-4">
          <ShieldCheck size={80} strokeWidth={1.5} className={theme === 'black' ? 'text-white' : 'text-black'} />
          <div className={`absolute -bottom-1 -right-1 rounded-full p-1 ${theme === 'black' ? 'bg-white text-black' : 'bg-black text-white'}`}>
            <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-wider uppercase">PatrolSEC</h1>
        
        {/* Loading Bar */}
        <div className="w-full mt-12 space-y-2">
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme === 'black' ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div 
              className={`h-full transition-all duration-100 ease-linear ${theme === 'black' ? 'bg-white' : 'bg-black'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`text-xs text-right font-mono ${subTextColor}`}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col items-center space-y-2 pb-8">
        <div className="flex items-center space-x-2">
           <img src="https://picsum.photos/32/32?grayscale" alt="Bountysec Logo" className="w-8 h-8 rounded-full opacity-80" />
           <span className={`text-sm font-medium ${subTextColor}`}>Develop by Bountysec Pvt Ltd</span>
        </div>
        <div className="h-0.5 w-12 bg-gray-500/30 rounded-full" />
      </div>
    </div>
  );
};