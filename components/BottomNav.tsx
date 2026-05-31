import React, { useState, useRef, useEffect } from 'react';
import { Phone, Camera, Lightbulb, Zap, X, User, AlertOctagon, Volume2, VolumeX } from 'lucide-react';
import { Theme, ViewState } from '../types';

interface BottomNavProps {
  theme: Theme;
  toggleTheme: () => void;
  setViewState: (view: ViewState) => void;
  viewState: ViewState;
}

export const BottomNav: React.FC<BottomNavProps> = ({ theme, toggleTheme, setViewState, viewState }) => {
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isCallMenuOpen, setIsCallMenuOpen] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);

  const bgColor = theme === 'black' ? 'bg-neutral-900' : 'bg-white';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const modalBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
      stopAlarm();
    };
  }, []);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCallClick = () => {
    setIsCallMenuOpen(true);
  };

  const performCall = (number: string) => {
    // If alarm is on, stop it before calling
    if (isAlarmActive) stopAlarm();
    window.location.href = `tel:${number}`;
    setIsCallMenuOpen(false);
  };

  // --- Web Audio API Siren Logic ---
  const startAlarm = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      // Master Volume
      gain.gain.setValueAtTime(0.5, ctx.currentTime); // Start volume
      gain.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.1); // Ramp up

      // Main Oscillator (The sound source)
      osc.type = 'sawtooth'; 
      osc.frequency.setValueAtTime(800, ctx.currentTime); // Base frequency

      // LFO (Low Frequency Oscillator) to modulate pitch (The Siren Effect)
      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(4, ctx.currentTime); // 4Hz = Fast panic wail
      lfoGain.gain.setValueAtTime(300, ctx.currentTime); // Modulate by +/- 300Hz

      // Connect graph: LFO -> LFO Gain -> Osc Frequency -> Gain -> Output
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      lfo.start();

      oscillatorRef.current = osc;
      lfoRef.current = lfo;
      setIsAlarmActive(true);
    } catch (e) {
      console.error("Audio API not supported or error:", e);
    }
  };

  const stopAlarm = () => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch (e) {}
      oscillatorRef.current = null;
    }
    if (lfoRef.current) {
      try { lfoRef.current.stop(); } catch (e) {}
      lfoRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsAlarmActive(false);
  };

  const toggleAlarm = () => {
    if (isAlarmActive) {
      stopAlarm();
    } else {
      startAlarm();
    }
  };

  const handleLightClick = async () => {
    if (isTorchOn) {
      stopMedia();
      setIsTorchOn(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      const track = stream.getVideoTracks()[0];
      // @ts-ignore
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      
      // @ts-ignore
      if (capabilities.torch) {
         try {
             // Use 'as any' to avoid TypeScript error for 'torch' which is not in the standard MediaTrackConstraintSet
             await track.applyConstraints({ advanced: [{ torch: true } as any] });
             streamRef.current = stream;
             setIsTorchOn(true);
         } catch (constraintErr) {
             console.error("Failed to apply torch constraint:", constraintErr);
             track.stop();
             toggleTheme(); 
         }
      } else {
         console.warn("Torch not supported on this device.");
         track.stop();
         toggleTheme(); 
      }
    } catch (err) {
      console.error("Error accessing camera for torch:", err);
      toggleTheme(); 
    }
  };

  return (
    <>
      <nav className={`fixed bottom-0 left-0 right-0 h-20 pb-4 px-6 border-t z-40 flex items-center justify-between ${bgColor} ${borderColor} ${textColor}`}>
        
        {/* Call Button */}
        <button 
          onClick={handleCallClick}
          className="flex flex-col items-center space-y-1 group active:scale-95 transition-transform"
        >
          <div className={`p-3 rounded-2xl transition-colors ${theme === 'black' ? 'bg-neutral-800 group-hover:bg-neutral-700' : 'bg-neutral-100 group-hover:bg-neutral-200'}`}>
            <Phone size={24} className="text-green-500" />
          </div>
          <span className="text-xs font-medium opacity-70">Call</span>
        </button>

        {/* Camera Button - Prominent */}
        <button 
          onClick={() => setViewState(viewState === 'camera' ? 'dashboard' : 'camera')}
          className="flex flex-col items-center space-y-1 -mt-8 active:scale-95 transition-transform"
        >
          <div className={`p-5 rounded-full shadow-lg border-4 ${theme === 'black' ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}>
            <Camera size={28} />
          </div>
          <span className="text-xs font-medium opacity-90">Camera</span>
        </button>

        {/* Light / Theme Button */}
        <button 
          onClick={handleLightClick}
          className="flex flex-col items-center space-y-1 group active:scale-95 transition-transform"
        >
          <div className={`p-3 rounded-2xl transition-colors ${
              isTorchOn 
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20'
                : theme === 'black' ? 'bg-neutral-800 group-hover:bg-neutral-700' : 'bg-neutral-100 group-hover:bg-neutral-200'
          }`}>
            {isTorchOn ? (
              <Zap size={24} className="fill-current" />
            ) : (
              <Lightbulb size={24} className={theme === 'white' ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
            )}
          </div>
          <span className="text-xs font-medium opacity-70">{isTorchOn ? 'Torch' : 'Light'}</span>
        </button>
      </nav>

      {/* Call Menu Modal */}
      {isCallMenuOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${isAlarmActive ? 'animate-pulse bg-red-900/40' : ''}`}>
           {/* Click outside to close (only if alarm is not active) */}
           <div className="absolute inset-0" onClick={() => !isAlarmActive && setIsCallMenuOpen(false)} />

           <div className={`w-full max-w-xs p-6 rounded-2xl shadow-2xl border relative z-10 ${modalBg} ${textColor} ${isAlarmActive ? 'border-red-500 shadow-red-500/50' : ''}`}>
              <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-500/20">
                 <h2 className="text-xl font-bold flex items-center space-x-2">
                    {isAlarmActive && <Volume2 className="text-red-500 animate-ping absolute" size={20} />}
                    <span className={isAlarmActive ? 'text-red-500 ml-6' : ''}>{isAlarmActive ? 'ALARM ACTIVE' : 'Call'}</span>
                 </h2>
                 <button onClick={() => { stopAlarm(); setIsCallMenuOpen(false); }} className="opacity-50 hover:opacity-100 p-1">
                   <X size={24} />
                 </button>
              </div>

              <div className="space-y-4">
                 <button 
                   onClick={toggleAlarm}
                   className={`w-full py-5 rounded-xl border-2 font-black text-xl shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all relative overflow-hidden group ${
                     isAlarmActive 
                       ? 'bg-white text-red-600 border-red-600 hover:bg-gray-100 animate-pulse' 
                       : 'bg-red-700 hover:bg-red-600 border-red-500 text-white shadow-red-900/20'
                   }`}
                 >
                    {!isAlarmActive && <div className="absolute inset-0 bg-red-600 animate-pulse opacity-50"></div>}
                    <div className="relative flex items-center space-x-2">
                        {isAlarmActive ? <VolumeX size={28} /> : <AlertOctagon size={28} />}
                        <span>{isAlarmActive ? 'STOP ALARM' : 'PANIC'}</span>
                    </div>
                 </button>

                 <button 
                   onClick={() => performCall('999')}
                   className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-3 active:scale-95 transition-transform"
                 >
                    <Phone size={24} />
                    <span>999</span>
                 </button>

                 <button 
                   onClick={() => performCall('123')}
                   className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-3 active:scale-95 transition-transform"
                 >
                    <User size={24} />
                    <span>Supervisor</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};