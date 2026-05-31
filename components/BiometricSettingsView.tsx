import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Fingerprint, CheckCircle, XCircle, Scan, Save, AlertTriangle, ShieldCheck, User, Camera, Smartphone } from 'lucide-react';
import { dbService } from '../services/db';

interface BiometricSettingsViewProps {
  theme: Theme;
  onBack: () => void;
}

export const BiometricSettingsView: React.FC<BiometricSettingsViewProps> = ({ theme, onBack }) => {
  const [activeTab, setActiveTab] = useState<'fingerprint' | 'face'>('fingerprint');
  
  // Fingerprint State
  const [fpStatus, setFpStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [fpError, setFpError] = useState('');
  
  // Face ID State
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [faceError, setFaceError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Common State
  const [isSimulation, setIsSimulation] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // Theme Colors
  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const subTextColor = theme === 'black' ? 'text-gray-400' : 'text-gray-500';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const tabActiveBg = theme === 'black' ? 'bg-neutral-800 text-white' : 'bg-white text-blue-600 shadow-sm';
  const tabInactiveBg = theme === 'black' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700';

  // Cleanup camera on unmount or tab switch
  useEffect(() => {
    return () => stopCamera();
  }, [activeTab]);

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  };

  // --- Fingerprint Logic ---
  const handleFpSuccess = async () => {
    await dbService.saveBiometric('fingerprint', { simulation: isSimulation });
    setFpStatus('success');
    setTimeout(() => setShowSaveButton(true), 1200);
  };

  const simulateFpSuccess = () => {
    setIsSimulation(true);
    setTimeout(() => handleFpSuccess(), 2000);
  };

  const handleScanFingerprint = async () => {
    setFpStatus('scanning');
    setShowSaveButton(false);
    setFpError('');
    setIsSimulation(false);

    const isIframe = window.self !== window.top;
    if (!window.PublicKeyCredential || isIframe) {
      console.warn("Biometrics restricted. Switching to simulation.");
      simulateFpSuccess();
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: { name: "PatrolSEC" },
        user: {
          id: Uint8Array.from("USER_ID_123", c => c.charCodeAt(0)),
          name: "guard@patrolsec.com",
          displayName: "Security Guard"
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
        attestation: "none"
      };

      const credential = await navigator.credentials.create({ publicKey });
      if (credential) handleFpSuccess();
      else throw new Error("No credential returned.");

    } catch (err: any) {
      console.error("Biometric Error:", err);
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes('not enabled') || err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          simulateFpSuccess();
          return;
      }
      setFpError('Failed to read fingerprint. Please try again.');
      setFpStatus('error');
    }
  };

  // --- Face ID Logic ---
  const handleFaceSuccess = async () => {
      let snapshotData = undefined;

      // 1. Capture Face Snapshot
      if (videoRef.current && !isSimulation) {
        try {
            const canvas = document.createElement('canvas');
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Mirror the context to match the user-facing camera view
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0);
                
                // Save compressed jpeg
                snapshotData = canvas.toDataURL('image/jpeg', 0.6);
            }
        } catch (e) {
            console.error("Failed to capture face snapshot", e);
        }
      }

      // 2. Save to DB
      await dbService.saveBiometric('face', {
          snapshot: snapshotData,
          simulation: isSimulation
      });
      
      setFaceStatus('success');
      stopCamera();
      setTimeout(() => setShowSaveButton(true), 1200);
  };

  const startFaceScan = async () => {
      setFaceStatus('scanning');
      setShowSaveButton(false);
      setFaceError('');
      setIsSimulation(false);
      
      try {
          // Attempt to get front camera
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
          });
          
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }

          // Simulate analysis time
          setTimeout(() => {
              if (streamRef.current) {
                  // Vibrate if supported
                  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                  handleFaceSuccess();
              }
          }, 3500);

      } catch (err: any) {
          console.error("Camera Error:", err);
          
          // Fallback simulation for environments without camera (or iframes)
          const isIframe = window.self !== window.top;
          if (isIframe || err.name === 'NotFoundError' || err.name === 'NotAllowedError') {
              setIsSimulation(true);
              setTimeout(() => {
                  handleFaceSuccess(); // Will save as simulation
              }, 3000);
          } else {
              setFaceError("Camera access denied or unavailable.");
              setFaceStatus('error');
          }
      }
  };

  const handleSaveAndExit = () => {
    onBack();
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <Fingerprint size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Biometric Setup</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className={`px-4 pt-4 pb-0`}>
          <div className={`flex p-1 rounded-xl ${theme === 'black' ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-100 border border-gray-200'}`}>
              <button 
                  onClick={() => { setActiveTab('fingerprint'); stopCamera(); setShowSaveButton(false); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-all ${activeTab === 'fingerprint' ? tabActiveBg : tabInactiveBg}`}
              >
                  <Fingerprint size={16} />
                  <span>Fingerprint</span>
              </button>
              <button 
                  onClick={() => { setActiveTab('face'); setShowSaveButton(false); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-all ${activeTab === 'face' ? tabActiveBg : tabInactiveBg}`}
              >
                  <Scan size={16} />
                  <span>Face ID</span>
              </button>
          </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
         
         {/* --- FINGERPRINT UI --- */}
         {activeTab === 'fingerprint' && (
             <div className="flex flex-col items-center justify-center w-full animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                    {/* Background Glow */}
                    <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
                        fpStatus === 'scanning' ? 'bg-blue-500 animate-pulse' : 
                        fpStatus === 'success' ? 'bg-green-500 scale-125 opacity-40' : 
                        fpStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />

                    <div className={`relative w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                        fpStatus === 'scanning' ? 'border-blue-500 bg-blue-500/10' : 
                        fpStatus === 'success' ? 'border-green-500 bg-green-500/10 scale-110 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 
                        fpStatus === 'error' ? 'border-red-500 bg-red-500/10' : 
                        theme === 'black' ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-50'
                    }`}>
                        <Fingerprint 
                            size={80} 
                            strokeWidth={1}
                            className={`transition-colors duration-500 ${
                                fpStatus === 'scanning' ? 'text-blue-500' : 
                                fpStatus === 'success' ? 'text-green-500 opacity-20' : 
                                fpStatus === 'error' ? 'text-red-500' : 
                                theme === 'black' ? 'text-gray-600' : 'text-gray-300'
                            }`} 
                        />
                        
                        {fpStatus === 'scanning' && (
                            <div className="absolute inset-0 overflow-hidden rounded-full">
                                <div className="w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] absolute top-0 animate-[scan_2s_ease-in-out_infinite]" />
                            </div>
                        )}

                        {fpStatus === 'success' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5 rounded-full backdrop-blur-[1px] animate-in zoom-in duration-500">
                                <ShieldCheck size={64} className="text-green-500 drop-shadow-xl animate-pulse" />
                            </div>
                        )}
                        {fpStatus === 'error' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-[1px]">
                                <XCircle size={48} className="text-red-500" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center space-y-2 max-w-xs h-20 mb-4">
                    <h2 className={`text-2xl font-bold transition-all ${
                        fpStatus === 'success' ? 'text-green-500' : fpStatus === 'error' ? 'text-red-500' : textColor
                    }`}>
                        {fpStatus === 'idle' && 'Scan Fingerprint'}
                        {fpStatus === 'scanning' && 'Scanning...'}
                        {fpStatus === 'success' && 'Verified & Saved'}
                        {fpStatus === 'error' && 'Scan Failed'}
                    </h2>
                    <p className={`text-sm ${subTextColor}`}>
                        {fpStatus === 'idle' && 'Touch the sensor to register your fingerprint.'}
                        {fpStatus === 'scanning' && 'Hold your finger steady.'}
                        {fpStatus === 'success' && 'Fingerprint login enabled.'}
                        {fpStatus === 'error' && (fpError || 'Try again.')}
                    </p>
                </div>

                {fpStatus !== 'success' ? (
                   <button 
                     onClick={handleScanFingerprint}
                     disabled={fpStatus === 'scanning'}
                     className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all ${
                        fpStatus === 'scanning' 
                          ? 'bg-gray-500 cursor-not-allowed opacity-50 text-white' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                     }`}
                   >
                     <Smartphone size={20} />
                     <span>{fpStatus === 'error' ? 'Retry Scan' : 'Start Scan'}</span>
                   </button>
                ) : null}
             </div>
         )}

         {/* --- FACE ID UI --- */}
         {activeTab === 'face' && (
             <div className="flex flex-col items-center justify-center w-full animate-in fade-in slide-in-from-right-4 duration-300">
                
                <div className="relative w-56 h-56 flex items-center justify-center mb-8">
                     {/* Camera Container */}
                     <div className={`w-full h-full rounded-[40px] overflow-hidden border-4 relative shadow-2xl ${
                         faceStatus === 'success' ? 'border-green-500' : 
                         faceStatus === 'error' ? 'border-red-500' : 
                         faceStatus === 'scanning' ? 'border-blue-500' :
                         theme === 'black' ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-gray-100'
                     }`}>
                         {faceStatus === 'scanning' && !isSimulation ? (
                             <video 
                               ref={videoRef}
                               autoPlay 
                               playsInline 
                               muted
                               className="w-full h-full object-cover mirror-mode"
                               style={{ transform: 'scaleX(-1)' }}
                             />
                         ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center opacity-30 space-y-2">
                                 <User size={64} />
                                 {isSimulation && <span className="text-[10px]">Simulated Cam</span>}
                             </div>
                         )}

                         {/* Scanning Overlay */}
                         {faceStatus === 'scanning' && (
                             <div className="absolute inset-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                         )}

                         {/* Success Overlay */}
                         {faceStatus === 'success' && (
                             <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center backdrop-blur-sm animate-in zoom-in duration-300">
                                 <div className="p-4 bg-white rounded-full shadow-lg">
                                    <CheckCircle size={40} className="text-green-600" />
                                 </div>
                             </div>
                         )}
                     </div>
                </div>

                <div className="text-center space-y-2 max-w-xs h-20 mb-4">
                    <h2 className={`text-2xl font-bold transition-all ${
                        faceStatus === 'success' ? 'text-green-500' : faceStatus === 'error' ? 'text-red-500' : textColor
                    }`}>
                        {faceStatus === 'idle' && 'Register Face'}
                        {faceStatus === 'scanning' && 'Scanning Face...'}
                        {faceStatus === 'success' && 'Face ID Registered'}
                        {faceStatus === 'error' && 'Failed'}
                    </h2>
                    <p className={`text-sm ${subTextColor}`}>
                        {faceStatus === 'idle' && 'Position your face within the frame.'}
                        {faceStatus === 'scanning' && 'Move your head slightly.'}
                        {faceStatus === 'success' && 'You can now use Face ID.'}
                        {faceStatus === 'error' && (faceError || 'Camera unavailable.')}
                    </p>
                </div>

                {faceStatus !== 'success' ? (
                   <button 
                     onClick={startFaceScan}
                     disabled={faceStatus === 'scanning'}
                     className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all ${
                        faceStatus === 'scanning' 
                          ? 'bg-gray-500 cursor-not-allowed opacity-50 text-white' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                     }`}
                   >
                     <Camera size={20} />
                     <span>{faceStatus === 'error' ? 'Retry Registration' : 'Register Face'}</span>
                   </button>
                ) : null}
             </div>
         )}
         
         {/* Simulation Notice (Shared) */}
         {isSimulation && (fpStatus === 'success' || faceStatus === 'success') && (
            <div className={`absolute top-2 right-2 text-[10px] px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 flex items-center space-x-1 border border-yellow-500/20 animate-in fade-in`}>
                <AlertTriangle size={10} />
                <span>Simulated</span>
            </div>
         )}

         {/* Save Button (Shared) */}
         {showSaveButton && (
            <button 
                onClick={handleSaveAndExit}
                className="w-full max-w-xs py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all animate-in slide-in-from-bottom-4 fade-in duration-500"
            >
                <Save size={20} />
                <span>Save & Close</span>
            </button>
         )}

         {/* Cancel Button (Shared - only when idle) */}
         {fpStatus === 'idle' && faceStatus === 'idle' && (
           <button 
              onClick={onBack}
              className={`w-full max-w-xs py-3 rounded-xl font-medium ${theme === 'black' ? 'text-gray-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100'}`}
           >
              Cancel
           </button>
         )}

         <style>{`
            @keyframes scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                50% { top: 100%; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
         `}</style>
      </main>
    </div>
  );
};