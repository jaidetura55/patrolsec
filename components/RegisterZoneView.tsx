import React, { useState } from 'react';
import { Theme, Zone } from '../types';
import { ArrowLeft, Save, MapPin, Globe, CheckCircle2, Loader2, Crosshair, Navigation } from 'lucide-react';
import { dbService } from '../services/db';

interface RegisterZoneViewProps {
  theme: Theme;
  onBack: () => void;
}

export const RegisterZoneView: React.FC<RegisterZoneViewProps> = ({ theme, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Location State
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // Form State
  const [country, setCountry] = useState('Malaysia');
  const [zoneName, setZoneName] = useState('');

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const inputBg = theme === 'black' ? 'bg-neutral-800 border-neutral-700 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-500';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
            setIsLocating(false);
            if (navigator.vibrate) navigator.vibrate(100);
        },
        (error) => {
            console.error("Error getting location", error);
            alert("Unable to retrieve location. Please enable GPS.");
            setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
      if (!zoneName) {
          alert("Please fill in required fields.");
          return;
      }

      setLoading(true);
      
      // Extended Zone type to include location since it might not be in the base interface yet
      const newZone: Zone & { coordinates?: { lat: number, lng: number } } = {
          country,
          zoneName,
          // Defaults for officer data which is now handled separately
          officerName: 'Unassigned',
          officerId: '',
          unit: '',
          shift: 'Day', 
          biometrics: {
              face: false,
              fingerprint: false
          },
          isActive: true,
          timestamp: new Date().toISOString(),
          coordinates: location || undefined
      };

      try {
          await dbService.saveZone(newZone);
          setLoading(false);
          setSuccess(true);
          setTimeout(() => {
              onBack();
          }, 1500);
      } catch (e) {
          console.error("Save failed", e);
          setLoading(false);
          alert("Failed to save data");
      }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Register New Zones</h1>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* GPS Section */}
          <section className="space-y-3">
              <div className={`p-4 rounded-2xl border ${cardBg} flex items-center justify-between`}>
                  <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${location ? 'bg-green-500/20 text-green-500' : (theme === 'black' ? 'bg-neutral-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                          <Navigation size={24} className={location ? "fill-current" : ""} />
                      </div>
                      <div>
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">GPS Coordinates</p>
                          {location ? (
                              <div className="font-mono font-bold text-lg flex flex-col leading-tight mt-0.5">
                                  <span>{location.lat.toFixed(6)},</span>
                                  <span>{location.lng.toFixed(6)}</span>
                              </div>
                          ) : (
                              <p className="text-sm opacity-50 italic mt-0.5">Location not set</p>
                          )}
                      </div>
                  </div>
                  
                  {/* Small Mini Box Indicator */}
                  <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${location ? 'border-green-500 bg-green-500/10' : 'border-dashed border-gray-500/30'}`}>
                      {location ? <CheckCircle2 size={20} className="text-green-500" /> : <MapPin size={20} className="opacity-20" />}
                  </div>
              </div>

              <button 
                onClick={handleGetLocation}
                disabled={isLocating}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all ${
                    isLocating 
                        ? 'bg-neutral-800 text-gray-500 cursor-wait' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                }`}
              >
                  {isLocating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Acquiring Signal...</span>
                      </>
                  ) : (
                      <>
                        <Crosshair size={18} />
                        <span>Set Zone Geolocation</span>
                      </>
                  )}
              </button>
          </section>

          <hr className={`border-t ${borderColor}`} />
          
          {/* 1. Location Details */}
          <section className="space-y-4">
              <h2 className="text-xs font-bold opacity-50 uppercase tracking-wider flex items-center space-x-2">
                  <MapPin size={14} /> <span>Zone Information</span>
              </h2>
              
              <div className="space-y-2">
                  <label className="text-xs font-medium opacity-70">Country</label>
                  <div className="relative">
                      <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                      <input 
                        list="countries" 
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none ${inputBg}`} 
                      />
                      <datalist id="countries">
                          <option value="Malaysia" />
                          <option value="Singapore" />
                          <option value="Indonesia" />
                          <option value="Thailand" />
                          <option value="Philippines" />
                      </datalist>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-medium opacity-70">Security Post / Outlet Name</label>
                  <input 
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="e.g. Main Lobby, North Wing"
                    className={`w-full px-4 py-3 rounded-xl border outline-none ${inputBg}`} 
                  />
              </div>
          </section>
      </main>

      {/* Footer / Save */}
      <div className={`p-6 border-t ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
          <button 
            onClick={handleSave}
            disabled={loading || success}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all ${
                success ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
              {loading ? (
                  <Loader2 size={24} className="animate-spin" />
              ) : success ? (
                  <>
                      <CheckCircle2 size={24} />
                      <span>Saved Successfully</span>
                  </>
              ) : (
                  <>
                      <Save size={24} />
                      <span>Save Zone</span>
                  </>
              )}
          </button>
      </div>
    </div>
  );
};