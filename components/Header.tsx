import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  MoreVertical, 
  CreditCard, 
  Calendar, 
  Clock, 
  FileText, 
  LifeBuoy, 
  Gauge, 
  Settings, 
  Info,
  ChevronRight
} from 'lucide-react';
import { Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  onMenuClick: (label: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, onMenuClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const bgColor = theme === 'black' ? 'bg-neutral-900/90' : 'bg-white/90';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const menuBg = theme === 'black' ? 'bg-neutral-900' : 'bg-white';
  const hoverColor = theme === 'black' ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100';

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { icon: <CreditCard size={18} />, label: "Subscription" },
    { icon: <Calendar size={18} />, label: "Schedule" },
    { icon: <Clock size={18} />, label: "History" },
    { icon: <FileText size={18} />, label: "Notice & Memo" },
    { icon: <LifeBuoy size={18} />, label: "Support" },
    { icon: <Gauge size={18} />, label: "Speed Test" },
    { icon: <Settings size={18} />, label: "Setting" },
    { icon: <Info size={18} />, label: "About" },
  ];

  const handleItemClick = (label: string) => {
    setIsMenuOpen(false);
    onMenuClick(label);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-16 px-4 flex items-center justify-between backdrop-blur-md border-b ${bgColor} ${borderColor} ${textColor}`}>
      {/* Left: Shield & Title */}
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${theme === 'black' ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
          <Shield size={24} className={theme === 'black' ? 'text-white' : 'text-black'} />
        </div>
        <div>
           <h1 className="font-bold leading-tight">PatrolSEC</h1>
           <span className="text-[10px] opacity-60 font-mono tracking-widest">GUARD SYSTEM</span>
        </div>
      </div>

      {/* Right: Menu Trigger */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`p-2 rounded-full transition-colors ${hoverColor}`}
        >
          <MoreVertical size={24} />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl overflow-hidden border transform origin-top-right transition-all ${menuBg} ${borderColor}`}>
            
            {/* Menu Header / Welcome */}
            <div className={`p-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-800/50' : 'bg-neutral-50'}`}>
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'black' ? 'bg-neutral-700' : 'bg-neutral-200'}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Welcome</h3>
                  <p className="text-xs opacity-60">Officer ID: 8821</p>
                </div>
              </div>
              <p className="text-[10px] opacity-70 leading-relaxed font-medium mt-2">
                Kawalan Keselamatan Kawalan Keselamatan Xteam Sdn Bhd
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2 overflow-y-auto max-h-[60vh]">
              {menuItems.map((item, index) => (
                <button 
                  key={index}
                  className={`w-full px-4 py-3 flex items-center justify-between text-sm transition-colors ${hoverColor}`}
                  onClick={() => handleItemClick(item.label)}
                >
                  <div className="flex items-center space-x-3 opacity-90">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              ))}
            </div>

            {/* Menu Footer */}
            <div className={`p-3 text-center border-t ${borderColor}`}>
              <span className="text-[10px] opacity-40">v1.0.4 • Build 2025</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};