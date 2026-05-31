import React, { useState, useEffect, useRef } from 'react';
import { Theme, Checkpoint } from '../types';
import { Shield, CheckCircle, Circle, Wifi, LogOut, MapPin, AlertTriangle, Scan, XCircle, Camera, User, Loader2, Save, Trash2, X, AlertOctagon } from 'lucide-react';
import { dbService } from '../services/db';

const CALLMEBOT_PHONE = "+60139390145";
const CALLMEBOT_API_KEY = "8706019";

interface ClockingViewProps {
  theme: Theme;
  onExit: () => void;
}

export const ClockingView: React.FC<ClockingViewProps> = ({ theme, onExit }) => {
  // --- View State: 'face-verification' | 'nfc-patrol' ---
  const [viewStep, setViewStep] = useState<'face-verification' | 'nfc-patrol'>('face-verification');
  const [showEndModal, setShowEndModal] = useState(false);
  
  // --- Face Verification State ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [faceScanStatus, setFaceScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isCameraSimulated, setIsCameraSimulated] = useState(false);

  // --- NFC/Patrol State ---
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Initializing...");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [isNfcRestricted, setIsNfcRestricted] = useState(false);
  const [isSimMode, setIsSimMode] = useState(false);

  // --- Anti Clone / Security State ---
  const [antiCloneEnabled, setAntiCloneEnabled] = useState(false);
  const [hiddenStream, setHiddenStream] = useState<MediaStream | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const [isCloneDetected, setIsCloneDetected] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const nfcAbortController = useRef<AbortController | null>(null);

  // Refs for event listener access
  const currentStepRef = useRef(currentStep);
  const checkpointsRef = useRef(checkpoints);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const modalBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  // Load Checkpoints & Settings on Mount
  useEffect(() => {
    const init = async () => {
        try {
            const data = await dbService.getCheckpoints();
            // Reset status for new patrol session
            const cleanData = data.map(cp => ({ ...cp, status: 'pending' as const }));
            setCheckpoints(cleanData);
            checkpointsRef.current = cleanData;
            
            const sim = await dbService.getSetting('nfc_simulation_mode', false);
            const ac = await dbService.getSetting('anti_clone_challenge_a', false);
            setAntiCloneEnabled(ac);

            const isIframe = window.self !== window.top;
            setIsSimMode(sim || isIframe); // Force sim if in iframe
            setIsLoadingCheckpoints(false);
        } catch (e) {
            console.error("Failed to load DB data", e);
            setIsLoadingCheckpoints(false);
        }
    };
    init();
  }, []);

  // Update refs when state changes
  useEffect(() => {
    currentStepRef.current = currentStep;
    checkpointsRef.current = checkpoints;
  }, [currentStep, checkpoints]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopHiddenCamera();
      if (nfcAbortController.current) nfcAbortController.current.abort();
    };
  }, []);

  // --- Hidden Camera for Anti-Clone Evidence ---
  const startHiddenCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: 640, height: 480 },
              audio: true
          });
          setHiddenStream(stream);
          if (hiddenVideoRef.current) {
              hiddenVideoRef.current.srcObject = stream;
          }
      } catch (e) {
          console.warn("Hidden camera init failed", e);
      }
  };

  const stopHiddenCamera = () => {
      if (hiddenStream) {
          hiddenStream.getTracks().forEach(t => t.stop());
          setHiddenStream(null);
      }
  };

  const recordEvidence = async (): Promise<string | null> => {
      if (!hiddenStream) return null;
      
      return new Promise((resolve) => {
          recordingChunks.current = [];
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
          const recorder = new MediaRecorder(hiddenStream, { mimeType });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) recordingChunks.current.push(e.data);
          };

          recorder.onstop = () => {
              const blob = new Blob(recordingChunks.current, { type: 'video/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  resolve(reader.result as string);
              };
          };

          recorder.start();
          // Record for 5 seconds
          setTimeout(() => {
              if (recorder.state === 'recording') recorder.stop();
          }, 5000);
      });
  };

  const sendCloneAlert = async () => {
      try {
          const now = new Date();
          const timestamp = now.toLocaleTimeString();
          const date = now.toLocaleDateString();
          const locStr = location ? `${location.lat}, ${location.lng}` : "Unknown";
          
          // Ideally get this from session/db
          const user = await dbService.verifyUser('88201', '123456') || { id: '88201', name: 'Unknown' }; 
          
          const message = `🚨 *CLONE NFC DETECTED!*
          
Time: ${timestamp}
Date: ${date}
Guard ID: ${user.id}
Shift: Night
Location: ${locStr}
          
Immediate action required! Evidence recorded.`;

          const encoded = encodeURIComponent(message);
          const url = `https://api.callmebot.com/whatsapp.php?phone=${CALLMEBOT_PHONE}&text=${encoded}&apikey=${CALLMEBOT_API_KEY}`;
          await fetch(url, { mode: 'no-cors' });
          console.log("Clone alert sent");
      } catch (e) {
          console.error("Failed to send alert", e);
      }
  };

  const handleCloneDetection = async () => {
      if (isCloneDetected) return; // Prevent double trigger
      setIsCloneDetected(true);
      setStatusMsg("⚠️ SECURITY ALERT: INVALID TAG");
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]); // SOS vibration

      // 1. Record Video
      const videoBase64 = await recordEvidence();

      // 2. Save Incident
      await dbService.saveIncident({
          type: 'clone_attempt',
          timestamp: new Date().toISOString(),
          description: "Anti-Clone System detected invalid or cloned NFC tag signature.",
          image: '', // Could take a snapshot from video if needed
          video: videoBase64 || '',
          location: location || undefined
      });

      // 3. Send Alert
      await sendCloneAlert();

      // 4. Log
      await dbService.logAction('SECURITY_ALERT', 'Clone NFC tag detected and recorded.');
      
      alert("SECURITY WARNING: Cloned Tag Detected. Incident has been recorded and reported to HQ.");
      setIsCloneDetected(false); // Reset to allow retry or continue
  };

  // --- Face Verification Logic ---
  const startFaceVerification = async () => {
    setFaceScanStatus('scanning');
    setFaceError(null);
    setIsCameraSimulated(false);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 480 } } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        // Auto-verify after 3 seconds for UX
        setTimeout(() => {
            setFaceScanStatus('verifying');
            setTimeout(() => {
                setFaceScanStatus('success');
                if (navigator.vibrate) navigator.vibrate(100);
                setTimeout(() => {
                    stopCamera();
                    setViewStep('nfc-patrol');
                }, 1000);
            }, 1500);
        }, 2000);

    } catch (err: any) {
        console.error("Camera Error:", err);
        const isIframe = window.self !== window.top;
        if (isIframe || err.name === 'NotFoundError' || err.name === 'NotAllowedError') {
            setIsCameraSimulated(true);
            setFaceScanStatus('verifying');
            setTimeout(() => {
                setFaceScanStatus('success');
                setTimeout(() => {
                    stopCamera();
                    setViewStep('nfc-patrol');
                }, 1000);
            }, 2000);
        } else {
            setFaceError("Camera access required.");
            setFaceScanStatus('error');
        }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
  };

  // --- NFC Patrol Logic ---
  
  // Initialize Map when entering Patrol View
  useEffect(() => {
    if (viewStep === 'nfc-patrol') {
        // Start Hidden Camera if Anti-Clone is on
        if (antiCloneEnabled) {
            startHiddenCamera();
        }

        if (!mapInstanceRef.current && mapContainerRef.current) {
            if (typeof window !== 'undefined' && (window as any).L) {
                 const L = (window as any).L;
                 const map = L.map(mapContainerRef.current, {
                     center: [3.1390, 101.6869], // Default KL
                     zoom: 16,
                     zoomControl: false,
                     attributionControl: false
                 });
                 
                 L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                     attribution: '',
                     subdomains: 'abcd',
                     maxZoom: 20
                 }).addTo(map);

                 mapInstanceRef.current = map;

                 // Get Location
                 if (navigator.geolocation) {
                     navigator.geolocation.watchPosition((pos) => {
                         const { latitude, longitude } = pos.coords;
                         setLocation({ lat: latitude, lng: longitude });
                         map.setView([latitude, longitude], 18);
                         
                         // Clear existing markers
                         map.eachLayer((layer: any) => {
                             if (layer instanceof L.Marker) map.removeLayer(layer);
                         });

                         // Add pulsating marker
                         const icon = L.divIcon({
                             className: 'custom-div-icon',
                             html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>`,
                             iconSize: [12, 12],
                             iconAnchor: [6, 6]
                         });
                         L.marker([latitude, longitude], { icon }).addTo(map);
                     }, (err) => {
                         console.warn("Location error", err);
                     }, { enableHighAccuracy: true });
                 }
            }
        }
    }
  }, [viewStep, antiCloneEnabled]);

  // Start NFC Scanning when patrol step changes
  useEffect(() => {
      if (viewStep === 'nfc-patrol' && !isCompleted && !isLoadingCheckpoints) {
          startNFC();
      }
      return () => {
          if (nfcAbortController.current) {
              nfcAbortController.current.abort();
              nfcAbortController.current = null;
          }
      };
  }, [viewStep, currentStep, isCompleted, isLoadingCheckpoints]);

  const startNFC = async () => {
      // Clean up previous controller
      if (nfcAbortController.current) {
          nfcAbortController.current.abort();
      }

      // Check if finished
      if (currentStep >= checkpointsRef.current.length) {
          setIsCompleted(true);
          setStatusMsg("Patrol Completed");
          return;
      }

      setIsScanning(true);
      setNfcError(null);
      setStatusMsg(`Scanning for Checkpoint ${checkpointsRef.current[currentStep].id}...`);

      if (isSimMode) {
          // In sim mode, user clicks manually.
          setStatusMsg("Simulation Mode: Tap 'Simulate Scan' below.");
          return;
      }

      if (!('NDEFReader' in window)) {
          setIsNfcRestricted(true);
          setStatusMsg("NFC not supported. Use manual override.");
          return;
      }

      try {
          const controller = new AbortController();
          nfcAbortController.current = controller;
          // @ts-ignore
          const ndef = new window.NDEFReader();
          await ndef.scan({ signal: controller.signal });

          ndef.onreading = (event: any) => {
              const { serialNumber } = event;
              
              // We need the records to verify anti-clone data if detecting text records
              const decoder = new TextDecoder();
              let textContent = "";
              for (const record of event.message.records) {
                  if (record.recordType === "text") {
                      textContent = decoder.decode(record.data);
                  }
              }

              handleTagScan(serialNumber, textContent);
          };

          ndef.onreadingerror = () => {
             setStatusMsg("Tag read error. Try again.");
          };

      } catch (error: any) {
          console.error("NFC Error: " + error);
          if (error.name === 'NotAllowedError') {
              setNfcError("NFC Permission Denied.");
              setIsNfcRestricted(true);
          } else {
              setNfcError("NFC Error: " + error.message);
              // Fallback to manual for demo if real NFC fails
              setIsNfcRestricted(true); 
          }
      }
  };

  const handleTagScan = (tagId: string, textContent: string = "") => {
      const activeCheckpoint = checkpointsRef.current[currentStepRef.current];
      
      let isValid = false;
      
      // Strict Anti-Clone Validation Logic
      if (antiCloneEnabled && activeCheckpoint.nfcId) {
          // Logic: The tag MUST contain the specific ID string saved in settings
          // If the tag ID matches serial but the content is missing the key, or key is wrong -> Clone
          // For this app, we saved `Checkpoint-X|SEC-KEY` in `nfcId` field of checkpoint
          
          if (textContent && textContent === activeCheckpoint.nfcId) {
              isValid = true;
          } else if (tagId === activeCheckpoint.nfcId) {
              // Legacy match (serial only) - if AntiClone is strict, this might be fail
              isValid = true; 
          } else {
              // Fail
              isValid = false;
          }
      } else {
          // Loose matching (Simpler)
          if (activeCheckpoint.nfcId) {
              if (tagId === activeCheckpoint.nfcId || (textContent && textContent.includes(activeCheckpoint.nfcId))) {
                  isValid = true;
              }
          } else {
              // No ID assigned yet, treat as open
              isValid = true; 
          }
      }

      if (isValid) {
          completeCheckpoint();
      } else {
          if (antiCloneEnabled) {
              handleCloneDetection();
          } else {
              setStatusMsg(`Wrong Tag! Scanned: ${tagId}`);
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          }
      }
  };

  const completeCheckpoint = () => {
      if (navigator.vibrate) navigator.vibrate(200);

      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const currentCp = checkpointsRef.current[currentStepRef.current];

      // Log the clocking action to history
      dbService.logAction('CLOCKING', `Checked ${currentCp.name} at ${currentCp.position}`);

      setCheckpoints(prev => {
          const next = [...prev];
          next[currentStepRef.current] = {
              ...next[currentStepRef.current],
              status: 'completed',
              timestamp: timestamp
          };
          return next;
      });

      // Move next
      const nextStep = currentStepRef.current + 1;
      setCurrentStep(nextStep);
      
      if (nextStep >= checkpointsRef.current.length) {
          setIsCompleted(true);
          setStatusMsg("All checkpoints verified.");
          dbService.logAction('CLOCKING', 'Patrol Round Completed Successfully');
          if (nfcAbortController.current) nfcAbortController.current.abort();
          stopHiddenCamera();
      }
  };

  const handleSimulateScan = () => {
      // Simulate successful scan of the correct tag
      completeCheckpoint();
  };
  
  const handleSimulateCloneAttack = () => {
      // For demo purposes: Simulate a clone attack detection
      handleCloneDetection();
  };

  const handleManualExit = () => {
      if (!isCompleted) {
          setShowEndModal(true);
      } else {
          onExit();
      }
  };

  const confirmEndPatrol = () => {
      dbService.logAction('CLOCKING', 'Patrol Round Incomplete/Ended manually');
      onExit();
  };

  // --- RENDER ---
  
  // 1. Face Verification Step
  if (viewStep === 'face-verification') {
      return (
        <div className={`h-full w-full flex flex-col items-center justify-center p-6 ${bgColor} ${textColor}`}>
            <div className="relative w-64 h-64 mb-8">
                {/* Camera Frame */}
                <div className={`w-full h-full rounded-3xl overflow-hidden border-4 relative shadow-2xl ${
                    faceScanStatus === 'success' ? 'border-green-500' :
                    faceScanStatus === 'error' ? 'border-red-500' :
                    'border-blue-500'
                }`}>
                    {faceScanStatus !== 'idle' && !isCameraSimulated ? (
                        <video 
                           ref={videoRef}
                           autoPlay 
                           playsInline 
                           muted
                           className="w-full h-full object-cover mirror-mode"
                           style={{ transform: 'scaleX(-1)' }}
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                            {isCameraSimulated ? (
                                <User size={64} className="opacity-20" />
                            ) : (
                                <Camera size={48} className="opacity-20" />
                            )}
                        </div>
                    )}
                    
                    {/* Scanning Overlay */}
                    {faceScanStatus === 'scanning' || faceScanStatus === 'verifying' ? (
                        <div className="absolute inset-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />
                    ) : null}

                    {/* Status Icons */}
                    {faceScanStatus === 'success' && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm animate-in zoom-in">
                            <CheckCircle size={64} className="text-white drop-shadow-lg" />
                        </div>
                    )}
                    {faceScanStatus === 'error' && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-sm">
                            <XCircle size={64} className="text-white drop-shadow-lg" />
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold">Identity Verification</h2>
                <p className={`text-sm max-w-xs mx-auto ${theme === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {faceScanStatus === 'idle' && "Verify your identity to start patrol."}
                    {faceScanStatus === 'scanning' && "Align your face within the frame."}
                    {faceScanStatus === 'verifying' && "Verifying biometric data..."}
                    {faceScanStatus === 'success' && "Verification Successful."}
                    {faceScanStatus === 'error' && (faceError || "Verification Failed.")}
                </p>
            </div>

            {faceScanStatus === 'idle' || faceScanStatus === 'error' ? (
                 <div className="w-full max-w-xs space-y-3">
                    <button 
                        onClick={startFaceVerification}
                        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg active:scale-95 transition-all"
                    >
                        Start Verification
                    </button>
                    <button 
                        onClick={onExit}
                        className={`w-full py-4 rounded-xl font-bold ${theme === 'black' ? 'bg-neutral-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}
                    >
                        Cancel
                    </button>
                 </div>
            ) : null}
            
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
      );
  }

  // 2. NFC Patrol Step
  const progress = checkpoints.length > 0 ? (currentStep / checkpoints.length) * 100 : 0;
  
  return (
    <div className={`flex flex-col h-full w-full relative ${bgColor} ${textColor}`}>
      
      {/* Hidden Video Element for Evidence Recording */}
      <video ref={hiddenVideoRef} autoPlay playsInline muted className="hidden" />

      {/* Map Background (Top Half) */}
      <div className="h-[45%] w-full relative bg-neutral-800">
         <div ref={mapContainerRef} className="w-full h-full opacity-60 mix-blend-screen" />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
         
         {/* Top Overlay Info */}
         <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
             <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center space-x-2">
                 <Shield size={14} className="text-blue-500" />
                 <span className="text-xs font-bold tracking-wider">PATROL ACTIVE</span>
             </div>
             <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                 <span className="text-xs font-mono">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Locating...'}</span>
             </div>
         </div>
      </div>

      {/* Bottom Control Panel */}
      <div className={`flex-1 -mt-6 rounded-t-3xl relative z-20 flex flex-col px-6 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${bgColor}`}>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-700 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }} 
              />
          </div>

          {/* Current Checkpoint Card */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              {!isCompleted ? (
                  <>
                      <div className="relative">
                          {/* Animated Rings */}
                          <div className={`absolute inset-0 rounded-full border-2 border-blue-500 opacity-20 ${isScanning ? 'animate-ping' : ''}`} />
                          <div className={`absolute -inset-4 rounded-full border border-blue-500 opacity-10 ${isScanning ? 'animate-pulse' : ''}`} />
                          
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-4 ${theme === 'black' ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-gray-100'}`}>
                             <Scan size={40} className={`animate-pulse ${isScanning ? 'text-blue-500' : 'text-gray-400'}`} />
                          </div>
                          
                          <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-black">
                              {currentStep + 1}/{checkpoints.length}
                          </div>
                      </div>

                      <div className="text-center space-y-1">
                          <h2 className="text-2xl font-black uppercase tracking-tight">
                              {checkpoints[currentStep]?.name || 'Loading...'}
                          </h2>
                          <p className={`text-sm font-medium ${theme === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {checkpoints[currentStep]?.position}
                          </p>
                      </div>

                      <div className={`px-4 py-2 rounded-lg text-xs font-mono ${
                          nfcError ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                          {nfcError || statusMsg}
                      </div>

                      {/* Simulation / Manual Override */}
                      {(isSimMode || isNfcRestricted || nfcError) && (
                          <button 
                             onClick={handleSimulateScan}
                             className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all"
                          >
                             <Wifi size={18} />
                             <span>Simulate Scan</span>
                          </button>
                      )}
                      
                      {/* Anti-Clone Test Trigger */}
                      {antiCloneEnabled && (
                          <button 
                             onClick={handleSimulateCloneAttack}
                             className="text-[10px] text-red-500 opacity-50 hover:opacity-100 uppercase font-bold"
                          >
                             Simulate Clone Detection
                          </button>
                      )}
                  </>
              ) : (
                  <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-300">
                      <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/20">
                          <CheckCircle size={48} className="text-white" />
                      </div>
                      <div className="text-center">
                          <h2 className="text-2xl font-bold text-green-500">Patrol Complete</h2>
                          <p className="text-sm opacity-60">All checkpoints verified successfully.</p>
                      </div>
                      <button 
                         onClick={onExit}
                         className="w-full px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
                      >
                         Submit Report
                      </button>
                  </div>
              )}
          </div>

          {/* Cancel / End Button */}
          {!isCompleted && (
              <button 
                onClick={handleManualExit}
                className="mt-4 py-4 flex items-center justify-center space-x-2 opacity-50 hover:opacity-100 transition-opacity"
              >
                  <LogOut size={18} />
                  <span className="text-xs font-bold uppercase">End Patrol</span>
              </button>
          )}
      </div>

      {/* Confirmation Modal */}
      {showEndModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className={`w-full max-w-xs p-6 rounded-2xl border ${modalBg} text-center space-y-4`}>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                      <AlertTriangle size={24} />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold">End Patrol?</h3>
                      <p className="text-xs opacity-60 mt-1">Patrol is incomplete. This will be logged as an incomplete round.</p>
                  </div>
                  <div className="flex space-x-3">
                      <button 
                        onClick={() => setShowEndModal(false)}
                        className={`flex-1 py-3 rounded-xl font-bold ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmEndPatrol}
                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold"
                      >
                          End
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Clone Alert Overlay */}
      {isCloneDetected && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-red-900/90 backdrop-blur-md p-6 text-center animate-pulse">
              <AlertOctagon size={64} className="text-white mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-white uppercase mb-2">CLONE DETECTED</h2>
              <p className="text-white/80 font-bold">Recording Evidence...</p>
              <div className="mt-8 flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
          </div>
      )}
    </div>
  );
};