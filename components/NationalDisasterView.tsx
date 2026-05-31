import React from 'react';
import { Theme } from '../types';
import { ArrowLeft, LifeBuoy, CloudRain, Flame, AlertTriangle, Mountain, Waves } from 'lucide-react';

interface NationalDisasterViewProps {
  theme: Theme;
  onBack: () => void;
}

export const NationalDisasterView: React.FC<NationalDisasterViewProps> = ({ theme, onBack }) => {
  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  const handleReport = (type: string) => {
      alert(`Report feature for ${type} coming soon.`);
  };

  const handleWeatherReport = () => {
      alert("Weather Report system connecting...");
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <LifeBuoy size={20} className="text-red-500" />
           <h1 className="font-bold text-lg">National Disaster Report</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Weather Report Button (Requested Feature) */}
          <button 
            onClick={handleWeatherReport}
            className="w-full p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-between group"
          >
              <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                      <CloudRain size={32} />
                  </div>
                  <div className="text-left">
                      <h2 className="text-xl font-bold">Weather Report</h2>
                      <p className="text-xs opacity-80">Check forecast & alerts</p>
                  </div>
              </div>
              <ArrowLeft size={24} className="rotate-180 opacity-50 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Report Categories */}
          <div className="space-y-4">
              <h3 className="text-xs font-bold opacity-50 uppercase tracking-widest px-1">Report Emergency</h3>
              
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleReport('Flood')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all hover:border-blue-500/50 ${cardBg}`}
                  >
                      <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                          <Waves size={24} />
                      </div>
                      <span className="font-bold text-sm">Flood</span>
                  </button>

                  <button 
                    onClick={() => handleReport('Fire')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all hover:border-orange-500/50 ${cardBg}`}
                  >
                      <div className="p-3 rounded-full bg-orange-500/10 text-orange-500">
                          <Flame size={24} />
                      </div>
                      <span className="font-bold text-sm">Fire</span>
                  </button>

                  <button 
                    onClick={() => handleReport('Landslide')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all hover:border-yellow-500/50 ${cardBg}`}
                  >
                      <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
                          <Mountain size={24} />
                      </div>
                      <span className="font-bold text-sm">Landslide</span>
                  </button>

                  <button 
                    onClick={() => handleReport('Other')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all hover:border-red-500/50 ${cardBg}`}
                  >
                      <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                          <AlertTriangle size={24} />
                      </div>
                      <span className="font-bold text-sm">Other</span>
                  </button>
              </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${theme === 'black' ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                  <h4 className="font-bold text-sm text-red-500">Emergency Hotline</h4>
                  <p className="text-xs opacity-70 mt-1 leading-relaxed">
                      For immediate life-threatening emergencies, please dial <span className="font-bold">999</span> directly. This reporting tool is for incident logging and coordination.
                  </p>
              </div>
          </div>

      </main>
    </div>
  );
};