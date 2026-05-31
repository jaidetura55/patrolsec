import React from 'react';
import { Theme, ViewState } from '../types';
import { ArrowLeft, PlusCircle, Edit, List, Map, UserPlus, UserMinus } from 'lucide-react';

interface ZoneSettingsViewProps {
  theme: Theme;
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

export const ZoneSettingsView: React.FC<ZoneSettingsViewProps> = ({ theme, onBack, onNavigate }) => {
  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  const MenuButton = ({ label, icon, onClick, colorClass }: { label: string, icon: React.ReactNode, onClick: () => void, colorClass: string }) => (
    <button 
      onClick={onClick}
      className={`w-full p-6 rounded-2xl border flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all shadow-sm ${cardBg}`}
    >
       <div className={`p-4 rounded-full ${colorClass}`}>
          {icon}
       </div>
       <span className="font-bold text-lg">{label}</span>
    </button>
  );

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <Map size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Zone Setting</h1>
        </div>
      </header>

      {/* Main Menu */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col items-center space-y-4 pb-6">
          <MenuButton 
            label="Register New Zone" 
            icon={<PlusCircle size={32} />} 
            colorClass={theme === 'black' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}
            onClick={() => onNavigate('registerZone')}
          />
          
          <MenuButton 
            label="Edit Zone" 
            icon={<Edit size={32} />} 
            colorClass={theme === 'black' ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'}
            onClick={() => alert("Edit Feature Coming Soon")} 
          />
          
          <MenuButton 
            label="View Zone" 
            icon={<List size={32} />} 
            colorClass={theme === 'black' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}
            onClick={() => alert("View List Coming Soon")}
          />

          <MenuButton 
            label="Register Officer" 
            icon={<UserPlus size={32} />} 
            colorClass={theme === 'black' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}
            onClick={() => onNavigate('registerOfficer')} 
          />

          <MenuButton 
            label="Delete Officer" 
            icon={<UserMinus size={32} />} 
            colorClass={theme === 'black' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}
            onClick={() => onNavigate('deleteOfficer')} 
          />
        </div>
      </main>
    </div>
  );
};