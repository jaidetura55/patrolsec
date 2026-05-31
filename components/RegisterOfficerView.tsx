import React, { useState } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Save, User, UserPlus, Fingerprint, Scan, Moon, Sun, CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { dbService } from '../services/db';

interface RegisterOfficerViewProps {
  theme: Theme;
  onBack: () => void;
}

export const RegisterOfficerView: React.FC<RegisterOfficerViewProps> = ({ theme, onBack }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [shift, setShift] = useState<'Day' | 'Night'>('Day');
  
  // Biometric Status Simulation
  const [isFingerprintRecorded, setIsFingerprintRecorded] = useState(false);
  const [isFaceIdRecorded, setIsFaceIdRecorded] = useState(false);
  const [recordingBio, setRecordingBio] = useState<'finger' | 'face' | null>(null);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const inputBg = theme === 'black' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-300';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  const simulateRecording = (type: 'finger' | 'face') => {
      setRecordingBio(type);
      setTimeout(() => {
          if (type === 'finger') setIsFingerprintRecorded(true);
          if (type === 'face') setIsFaceIdRecorded(true);
          setRecordingBio(null);
      }, 2000);
  };

  const handleSave = async () => {
      if (!fullName || !workerId) {
          alert("Please enter full name and worker ID.");
          return;
      }

      setLoading(true);
      try {
          await dbService.assignOfficerToActiveZone({
              name: fullName,
              id: workerId,
              shift: shift,
              biometrics: {
                  face: isFaceIdRecorded,
                  fingerprint: isFingerprintRecorded
              }
          });
          
          await dbService.syncData();
          
          alert("Officer Registered Successfully. Dashboard Updated.");
          setLoading(false);
          onBack();
      } catch (e) {
          console.error("Save failed", e);
          alert("Failed to save officer data.");
          setLoading(false);
      }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <UserPlus size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Register Officer</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Personal Info */}
          <section className="space-y-4">
              <h2 className="text-xs font-bold opacity-50 uppercase tracking-wider flex items-center space-x-2">
                  <User size={14} /> <span>Personal Details</span>
              </h2>
              
              <div className="space-y-2">
                  <label className="text-xs font-medium opacity-70">Full Name</label>
                  <input 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Muhammad Ali Bin Abu"
                    className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${inputBg}`} 
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-medium opacity-70">Worker ID</label>
                  <div className="relative">
                      <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                      <input 
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                        placeholder="e.g. 88201"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${inputBg}`} 
                      />
                  </div>
              </div>
          </section>

          {/* Shift Selection */}
          <section className="space-y-4">
              <h2 className="text-xs font-bold opacity-50 uppercase tracking-wider">Assigned Shift</h2>
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShift('Day')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                        shift === 'Day' 
                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                            : `${cardBg} opacity-60`
                    }`}
                  >
                      <Sun size={24} />
                      <span className="font-bold text-sm">Day Shift</span>
                  </button>
                  
                  <button 
                    onClick={() => setShift('Night')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                        shift === 'Night' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-500' 
                            : `${cardBg} opacity-60`
                    }`}
                  >
                      <Moon size={24} />
                      <span className="font-bold text-sm">Night Shift</span>
                  </button>
              </div>
          </section>

          {/* Biometrics */}
          <section className="space-y-4">
              <h2 className="text-xs font-bold opacity-50 uppercase tracking-wider flex items-center space-x-2">
                  <Scan size={14} /> <span>Biometric Enrollment</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => simulateRecording('finger')}
                    disabled={isFingerprintRecorded || recordingBio !== null}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all relative overflow-hidden ${
                        isFingerprintRecorded 
                            ? 'bg-green-500/10 border-green-500 text-green-500' 
                            : `${cardBg} active:scale-95`
                    }`}
                  >
                      {recordingBio === 'finger' ? (
                          <Loader2 size={24} className="animate-spin text-blue-500" />
                      ) : isFingerprintRecorded ? (
                          <CheckCircle2 size={24} />
                      ) : (
                          <Fingerprint size={24} />
                      )}
                      <span className="font-bold text-sm">{isFingerprintRecorded ? 'Recorded' : 'Scan Fingerprint'}</span>
                  </button>

                  <button 
                    onClick={() => simulateRecording('face')}
                    disabled={isFaceIdRecorded || recordingBio !== null}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all relative overflow-hidden ${
                        isFaceIdRecorded 
                            ? 'bg-green-500/10 border-green-500 text-green-500' 
                            : `${cardBg} active:scale-95`
                    }`}
                  >
                      {recordingBio === 'face' ? (
                          <Loader2 size={24} className="animate-spin text-blue-500" />
                      ) : isFaceIdRecorded ? (
                          <CheckCircle2 size={24} />
                      ) : (
                          <Scan size={24} />
                      )}
                      <span className="font-bold text-sm">{isFaceIdRecorded ? 'Recorded' : 'Record Face ID'}</span>
                  </button>
              </div>
          </section>

      </main>

      {/* Footer / Save */}
      <div className={`p-6 border-t ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
          <button 
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
              {loading ? (
                  <Loader2 size={24} className="animate-spin" />
              ) : (
                  <>
                      <Save size={24} />
                      <span>Save & Sync</span>
                  </>
              )}
          </button>
      </div>
    </div>
  );
};