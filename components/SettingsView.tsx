import React, { useState, useEffect } from 'react';
import { Theme, ViewState } from '../types';
import { Settings, Fingerprint, MapPin, UserCheck, ArrowLeft, ChevronRight, Zap, ShieldCheck, Globe, Map } from 'lucide-react';
import { dbService } from '../services/db';

interface SettingsViewProps {
  theme: Theme;
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onBack, onNavigate }) => {
  const [isSimMode, setIsSimMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
        const isIframe = window.self !== window.top;
        const stored = await dbService.getSetting('nfc_simulation_mode', false);
        setIsSimMode(stored || isIframe);
    };
    loadSettings();
  }, []);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';

  const toggleSimMode = async () => {
    const newVal = !isSimMode;
    setIsSimMode(newVal);
    await dbService.saveSetting('nfc_simulation_mode', newVal);
  };

  const SettingItem = ({ icon, label, onClick, sublabel }: { icon: React.ReactNode, label: string, onClick?: () => void, sublabel?: string }) => (
    <button 
      onClick={onClick}
      className={`w-full p-4 rounded-xl border flex items-center justify-between active:scale-95 transition-all ${cardBg} group`}
    >
        <div className="flex items-center space-x-4">
            <div className={`p-2.5 rounded-lg transition-colors ${theme === 'black' ? 'bg-neutral-800 text-blue-400 group-hover:bg-neutral-700' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                {icon}
            </div>
            <div className="text-left">
              <span className="font-medium text-sm md:text-base block">{label}</span>
              {sublabel && <span className="text-[10px] opacity-50 block">{sublabel}</span>}
            </div>
        </div>
        <ChevronRight size={18} className="opacity-40" />
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
           <Settings size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Setting</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
         
         <section className="space-y-2">
            <h3 className="text-[10px] font-bold px-1 opacity-50 uppercase tracking-wider">Patrol Settings</h3>
            
            <SettingItem 
              icon={<Map size={20} />} 
              label="Zone Setting" 
              sublabel="Register & Manage Zones"
              onClick={() => onNavigate('zoneSettings')}
            />
            
            <SettingItem icon={<UserCheck size={20} />} label="Attendance Setting" />
            <SettingItem 
              icon={<MapPin size={20} />} 
              label="Checkpoint Setting" 
              onClick={() => onNavigate('checkpointSettings')}
            />
            <SettingItem 
              icon={<Fingerprint size={20} />} 
              label="Biometric Setting" 
              onClick={() => onNavigate('biometricSettings')}
            />
         </section>

         {/* Security Status Section */}
         <section className="space-y-2">
            <h3 className="text-[10px] font-bold px-1 opacity-50 uppercase tracking-wider">System Security</h3>
            <div className={`w-full p-4 rounded-xl border flex items-center justify-between ${cardBg}`}>
               <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-lg ${theme === 'black' ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600'}`}>
                     <ShieldCheck size={20} />
                  </div>
                  <div className="text-left">
                     <span className="font-medium text-sm md:text-base block">SSL Certificate</span>
                     <span className="text-[10px] opacity-60 block">youngpapi.com (Let's Encrypt)</span>
                  </div>
               </div>
               <div className="flex items-center space-x-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-500 font-bold uppercase">Active</span>
               </div>
            </div>

            <div className={`w-full p-4 rounded-xl border flex items-center justify-between ${cardBg}`}>
               <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-lg ${theme === 'black' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                     <Globe size={20} />
                  </div>
                  <div className="text-left">
                     <span className="font-medium text-sm md:text-base block">HTTPS Configuration</span>
                     <span className="text-[10px] opacity-60 block">Enforced for youngpapi.com</span>
                  </div>
               </div>
               <span className="text-[10px] opacity-40">v1.0.4</span>
            </div>
         </section>

         {/* Developer Options */}
         <section className="pt-4 border-t border-gray-500/10">
            <h3 className={`text-[10px] font-bold px-1 mb-2 uppercase opacity-50 tracking-wider`}>Developer Tools</h3>
            <button 
              onClick={toggleSimMode}
              className={`w-full p-4 rounded-xl border flex items-center justify-between active:scale-95 transition-all ${cardBg}`}
            >
                <div className="flex items-center space-x-4">
                    <div className={`p-2.5 rounded-lg transition-colors ${theme === 'black' ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        <Zap size={20} />
                    </div>
                    <div className="text-left">
                        <span className="font-medium text-sm md:text-base block">NFC Simulation Mode</span>
                        <span className="text-[10px] opacity-60 block">Enable for non-NFC environments</span>
                    </div>
                </div>
                
                {/* Toggle Switch */}
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${isSimMode ? 'bg-purple-600' : 'bg-gray-500/30'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${isSimMode ? 'translate-x-5' : ''}`} />
                </div>
            </button>
         </section>
      </main>
    </div>
  );
};