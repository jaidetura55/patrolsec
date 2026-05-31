import React, { useRef, useEffect, useState } from 'react';
import { Theme, ViewState } from '../types';
import { ArrowLeft, Zap, ZapOff, Clock, AlertTriangle, ChevronRight, XCircle, Lock, Save, RotateCcw, FileText, Check, Loader2 } from 'lucide-react';
import { dbService } from '../services/db';

interface CameraViewProps {
  theme: Theme;
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ theme, onBack, onNavigate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [mode, setMode] = useState<'selection' | 'incident'>('selection');
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied' | 'error'>('checking');

  // Incident Capture State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
        try {
            // Step 1: Try specific rear camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: true
            });

            if (!mounted) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            setupStream(stream);
        } catch (err: any) {
            console.warn("Camera environment mode failed, trying fallback:", err.name);
            
            try {
                // Step 2: Fallback to any camera
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                if (mounted) setupStream(fallbackStream);
            } catch (innerErr: any) {
                console.error("All camera requests failed:", innerErr.name);
                if (mounted) {
                    if (innerErr.name === 'NotAllowedError' || innerErr.name === 'PermissionDeniedError') {
                        setPermissionState('denied');
                    } else {
                        setError(innerErr.message || "No camera device found");
                        setPermissionState('error');
                    }
                }
            }
        }
    };

    const setupStream = (stream: MediaStream) => {
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        // @ts-ignore
        if (capabilities.torch) {
            setHasFlash(true);
        }
        setPermissionState('granted');
    };

    initCamera();

    return () => {
        mounted = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const newFlashState = !isFlashOn;
    try {
      // Use 'as any' to avoid TypeScript error for 'torch' which is not in the standard MediaTrackConstraintSet
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      setIsFlashOn(newFlashState);
    } catch (err) {
      console.error("Error toggling flash:", err);
    }
  };

  const handleBack = () => {
    if (capturedImage) {
        if (window.confirm("Discard captured image?")) {
            setCapturedImage(null);
            setDescription('');
        }
        return;
    }
    if (mode !== 'selection') {
      setMode('selection');
    } else {
      onBack();
    }
  };

  const handleClocking = () => {
     onNavigate('clocking');
  };

  const captureImage = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            if (navigator.vibrate) navigator.vibrate(100);
        }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDescription('');
  };

  const saveReport = async () => {
    if (!capturedImage) return;
    setIsSaving(true);
    let locationData = undefined;
    let locationError = false;
    
    // Attempt to get location
    try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 5000,
                enableHighAccuracy: true
            });
        });
        locationData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
        console.warn("Location unavailable for incident report");
        locationError = true;
    }

    try {
        await dbService.saveIncident({
            timestamp: new Date().toISOString(),
            description: description || "No description provided.",
            image: capturedImage,
            location: locationData
        });
        
        await dbService.logAction('REPORT_INCIDENT', 'New incident report submitted');
        
        // Reset and go back
        setCapturedImage(null);
        setDescription('');
        setMode('selection');
        
        if (locationError) {
            alert("Incident saved locally, but GPS location could not be retrieved.");
        } else {
            alert("Incident report saved successfully.");
        }
    } catch (e) {
        console.error("Failed to save report", e);
        alert("Failed to save report. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  if (permissionState === 'denied') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black p-6 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <Lock size={40} className="text-red-500" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Access Required</h2>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                    PatrolSEC needs access to your camera and microphone to document incidents and clocking evidence.
                </p>
            </div>
            <div className="flex flex-col space-y-3 w-full max-w-xs">
                <button 
                   onClick={() => window.location.reload()}
                   className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                    Try Again
                </button>
                <button 
                   onClick={onBack}
                   className="w-full py-3 rounded-xl bg-neutral-800 text-gray-400 font-medium"
                >
                    Cancel
                </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-4">
                Please check your browser settings if this persists.
            </p>
        </div>
      );
  }

  if (permissionState === 'error') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black p-6 text-center text-white">
            <AlertTriangle size={48} className="text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Camera Error</h2>
            <p className="text-sm opacity-70 mb-6">{error || "No camera device found"}</p>
            <button onClick={onBack} className="px-6 py-2 bg-white text-black rounded-lg">Return</button>
        </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-black z-0">
      
      {/* Back Button */}
      {!capturedImage && (
        <button 
            onClick={handleBack}
            className="absolute top-4 left-4 z-[60] p-3 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all shadow-lg"
        >
            <ArrowLeft size={24} />
        </button>
      )}

      {/* Flash Button */}
      {!capturedImage && hasFlash && mode !== 'selection' && (
        <button 
          onClick={toggleFlash}
          className={`absolute top-4 right-4 z-[60] p-3 rounded-full backdrop-blur-md border active:scale-95 transition-all shadow-lg ${
            isFlashOn 
              ? 'bg-yellow-500 text-white border-yellow-400 shadow-yellow-500/20' 
              : 'bg-black/50 text-white border-white/10'
          }`}
        >
          {isFlashOn ? <Zap size={24} className="fill-current" /> : <ZapOff size={24} />}
        </button>
      )}

      {/* Camera Preview */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover transition-opacity duration-500 ${permissionState === 'granted' && !capturedImage ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Captured Image Preview & Form */}
      {capturedImage && (
        <div className="absolute inset-0 z-[70] bg-black flex flex-col">
            <div className="relative flex-1 overflow-hidden bg-neutral-900">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                <button 
                  onClick={handleRetake}
                  className="absolute top-4 left-4 p-3 bg-black/60 text-white rounded-full backdrop-blur-md"
                >
                    <RotateCcw size={24} />
                </button>
            </div>
            
            <div className="p-6 bg-neutral-900 border-t border-neutral-800 space-y-4 animate-in slide-in-from-bottom-10">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center space-x-2">
                        <FileText size={14} />
                        <span>Incident Description</span>
                    </label>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the incident, location, or observation..."
                        className="w-full h-24 bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                </div>
                
                <div className="flex items-center space-x-3">
                    <button 
                       onClick={handleRetake}
                       disabled={isSaving}
                       className="flex-1 py-4 rounded-xl bg-neutral-800 text-gray-300 font-bold active:scale-95 transition-all"
                    >
                        Retake
                    </button>
                    <button 
                       onClick={saveReport}
                       disabled={isSaving}
                       className="flex-[2] py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                    >
                        {isSaving ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Save size={20} />
                        )}
                        <span>{isSaving ? 'Saving...' : 'Save Report'}</span>
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {permissionState === 'checking' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="flex flex-col items-center space-y-3">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-xs uppercase tracking-widest">Starting Camera...</p>
              </div>
          </div>
      )}

      {/* Selection Menu Overlay */}
      {permissionState === 'granted' && mode === 'selection' && !capturedImage && (
        <div className="absolute inset-0 z-[55] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Select Action</h2>
                <p className="text-sm text-gray-400">Choose an operation to proceed</p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleClocking}
                  className="w-full p-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-between group active:scale-95 transition-all shadow-lg shadow-blue-900/20 border border-blue-500/20"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white/20 rounded-xl"><Clock size={24} /></div>
                    <div className="text-left">
                      <span className="block">Clocking Now</span>
                      <span className="text-xs opacity-70 font-normal">Check-in at location</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => setMode('incident')}
                  className="w-full p-5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center justify-between group active:scale-95 transition-all shadow-lg shadow-orange-900/20 border border-orange-500/20"
                >
                  <div className="flex items-center space-x-4">
                     <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={24} /></div>
                     <div className="text-left">
                      <span className="block">Incident Report</span>
                      <span className="text-xs opacity-70 font-normal">Report issue or hazard</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={onBack}
                  className="w-full p-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-gray-400 hover:text-white font-medium flex items-center justify-center space-x-2 active:scale-95 transition-all"
                >
                  <XCircle size={20} />
                  <span>Exit Camera</span>
                </button>
              </div>
           </div>
        </div>
      )}
      
      {/* Active Incident Mode UI */}
      {permissionState === 'granted' && mode === 'incident' && !capturedImage && (
        <>
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 z-40 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 shadow-sm">
            <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Live</span>
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          </div>
          
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40">
             <span className="text-xs font-bold px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md bg-orange-500/20 border-orange-500/50 text-orange-200">
               INCIDENT MODE
             </span>
          </div>
          
          <div className="absolute bottom-24 w-full flex justify-center pointer-events-none z-40">
            <div className="text-white/80 text-xs bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 shadow-lg">
              Tap capture to Report
            </div>
          </div>
          
          <div className="absolute bottom-8 w-full flex justify-center z-50">
            <button 
                onClick={captureImage}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform bg-white/10 backdrop-blur-sm hover:bg-white/20"
            >
               <div className="w-12 h-12 rounded-full bg-white" />
            </button>
          </div>

          <div className="absolute inset-16 pointer-events-none opacity-50 z-30">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white"></div>
          </div>
        </>
      )}
    </div>
  );
};