import React, { useState } from 'react';
import { Theme, ViewState } from '../types';
import { ArrowLeft, ShieldCheck, X, Terminal, Database, Cpu, Nfc, Lock, Copy, MapPin, LogIn } from 'lucide-react';

interface AboutViewProps {
  theme: Theme;
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ theme, onBack, onNavigate }) => {
  const [clickCount, setClickCount] = useState(0);
  const [showHiddenMenu, setShowHiddenMenu] = useState(false);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const subTextColor = theme === 'black' ? 'text-gray-500' : 'text-gray-400';
  const modalBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  const handleVersionClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 3) {
      setShowHiddenMenu(true);
      setClickCount(0); // Reset for next time
    }
    
    // Reset count if idle for 2 seconds
    setTimeout(() => {
        setClickCount(0);
    }, 2000);
  };

  const handleDiagnoseClick = () => {
    if (onNavigate) {
      onNavigate('diagnose');
    }
  };

  const handleAntitheftClick = () => {
    if (onNavigate) {
        onNavigate('antitheft');
    }
  };

  const handleAntiCloneClick = () => {
      if (onNavigate) {
          onNavigate('antiClone');
      }
  };

  const handleGeofencingClick = () => {
    if (onNavigate) {
      onNavigate('geofencing');
    }
  };

  const handleDMCLoginClick = () => {
    if (onNavigate) {
      onNavigate('dmcLogin');
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">About</h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          
          <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-500">
             <div className={`p-8 rounded-full shadow-2xl ${theme === 'black' ? 'bg-neutral-900 shadow-neutral-900/50' : 'bg-white shadow-gray-200'}`}>
                <ShieldCheck size={80} strokeWidth={1.5} className="text-blue-600" />
             </div>
             
             <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tighter uppercase">PatrolSEC</h2>
                <p className="text-sm font-medium opacity-60">Enterprise Security Solution</p>
             </div>
          </div>

          <div className="flex flex-col items-center space-y-4 w-full max-w-xs pt-8 border-t border-gray-500/10">
              <div className="text-center space-y-1">
                  <p className={`text-xs uppercase font-bold tracking-widest ${subTextColor}`}>Version</p>
                  <button 
                    onClick={handleVersionClick}
                    className="px-4 py-2 rounded-lg hover:bg-gray-500/5 active:scale-95 transition-all"
                  >
                      <span className="font-mono text-lg font-bold">v1.0.4</span>
                  </button>
                  <p className="text-xs font-mono opacity-40">Build 20250218.RELEASE</p>
              </div>

              <div className="text-center text-[10px] opacity-40 leading-relaxed pt-8">
                  <p>© 2025 Bountysec Pvt Ltd.</p>
                  <p>All rights reserved.</p>
              </div>
          </div>
      </main>

      {/* Hidden Menu Modal */}
      {showHiddenMenu && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-6 ${modalBg} shadow-2xl overflow-y-auto max-h-[80vh]`}>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-red-500">
                          <Terminal size={20} />
                          <h3 className="font-bold text-lg uppercase tracking-wider">Hidden Menu</h3>
                      </div>
                      <button 
                        onClick={() => setShowHiddenMenu(false)}
                        className="p-1 rounded-full hover:bg-gray-500/10"
                      >
                          <X size={24} />
                      </button>
                  </div>

                  <div className="space-y-3">
                      <div className={`p-4 rounded-xl border flex items-center space-x-3 ${theme === 'black' ? 'bg-black border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                          <Database size={20} className="text-purple-500" />
                          <div>
                              <p className="text-sm font-bold">Clear Local Database</p>
                              <p className="text-[10px] opacity-50">Resets all cached data</p>
                          </div>
                      </div>

                      <div className={`p-4 rounded-xl border flex items-center space-x-3 ${theme === 'black' ? 'bg-black border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                          <Cpu size={20} className="text-green-500" />
                          <div>
                              <p className="text-sm font-bold">Debug Logs</p>
                              <p className="text-[10px] opacity-50">View system telemetry</p>
                          </div>
                      </div>

                      <button 
                        onClick={handleDiagnoseClick}
                        className={`w-full p-4 rounded-xl border flex items-center space-x-3 active:scale-95 transition-all text-left ${theme === 'black' ? 'bg-black border-neutral-800 hover:bg-neutral-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                      >
                          <Nfc size={20} className="text-blue-500" />
                          <div>
                              <p className="text-sm font-bold">NFC Status</p>
                              <p className="text-[10px] opacity-50">Diagnose hardware & tags</p>
                          </div>
                      </button>

                      <button 
                        onClick={handleAntitheftClick}
                        className={`w-full p-4 rounded-xl border flex items-center space-x-3 active:scale-95 transition-all text-left ${theme === 'black' ? 'bg-black border-neutral-800 hover:bg-neutral-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                      >
                          <Lock size={20} className="text-orange-500" />
                          <div>
                              <p className="text-sm font-bold">Antitheft</p>
                              <p className="text-[10px] opacity-50">Device security protection</p>
                          </div>
                      </button>

                      <button 
                        onClick={handleAntiCloneClick}
                        className={`w-full p-4 rounded-xl border flex items-center space-x-3 active:scale-95 transition-all text-left ${theme === 'black' ? 'bg-black border-neutral-800 hover:bg-neutral-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                      >
                          <Copy size={20} className="text-red-500" />
                          <div>
                              <p className="text-sm font-bold">Anti Clone</p>
                              <p className="text-[10px] opacity-50">Detect & Prevent Cloned Tags</p>
                          </div>
                      </button>

                      <button 
                        onClick={handleGeofencingClick}
                        className={`w-full p-4 rounded-xl border flex items-center space-x-3 active:scale-95 transition-all text-left ${theme === 'black' ? 'bg-black border-neutral-800 hover:bg-neutral-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                      >
                          <MapPin size={20} className="text-cyan-500" />
                          <div>
                              <p className="text-sm font-bold">Geofencing Test</p>
                              <p className="text-[10px] opacity-50">Test location boundaries</p>
                          </div>
                      </button>

                      <button 
                        onClick={handleDMCLoginClick}
                        className={`w-full p-4 rounded-xl border flex items-center space-x-3 active:scale-95 transition-all text-left ${theme === 'black' ? 'bg-black border-neutral-800 hover:bg-neutral-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                      >
                          <LogIn size={20} className="text-indigo-500" />
                          <div>
                              <p className="text-sm font-bold">DMC Login</p>
                              <p className="text-[10px] opacity-50">Access Data Management Console</p>
                          </div>
                      </button>
                  </div>
                  
                  <div className="text-center pt-2">
                      <p className="text-[10px] font-mono opacity-30">DEVELOPER MODE ENABLED</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};