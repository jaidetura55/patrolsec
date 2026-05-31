import React, { useState, useRef, useEffect } from 'react';
import { Theme, Visitor } from '../types';
import { 
  ArrowLeft, 
  UserPlus, 
  LogOut, 
  QrCode, 
  Search, 
  User, 
  Clock, 
  Car, 
  CreditCard, 
  ScanLine, 
  Camera, 
  X, 
  Loader2, 
  Save, 
  Smartphone,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Video
} from 'lucide-react';
import { dbService } from '../services/db';

interface VisitorViewProps {
  theme: Theme;
  onBack: () => void;
}

type ViewMode = 'list' | 'mode-select' | 'test-reg' | 'checkout' | 'details';
type CameraMode = 'idle' | 'face' | 'vehicle' | 'id-ocr';

export const VisitorView: React.FC<VisitorViewProps> = ({ theme, onBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Registration Form State
  const [visitorName, setVisitorName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [purpose, setPurpose] = useState(''); 
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceVideo, setFaceVideo] = useState<string | null>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  
  // Detail View State
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  // Checkout State
  const [checkoutQuery, setCheckoutQuery] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<Visitor | null>(null);

  // Camera & OCR State
  const [cameraMode, setCameraMode] = useState<CameraMode>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Default back
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false); // Video recording indicator
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Active Visitors List State
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const inputBg = theme === 'black' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-300';
  const placeholderBg = theme === 'black' ? 'bg-neutral-800' : 'bg-gray-200';

  // Load Active Visitors & Persisted Form Data
  useEffect(() => {
    loadActiveVisitors();

    // Restore registration form data from local storage
    const savedName = localStorage.getItem('vis_reg_name');
    const savedId = localStorage.getItem('vis_reg_id');
    const savedPlate = localStorage.getItem('vis_reg_plate');
    const savedPurpose = localStorage.getItem('vis_reg_purpose');

    if (savedName) setVisitorName(savedName);
    if (savedId) setVisitorId(savedId);
    if (savedPlate) setPlateNumber(savedPlate);
    if (savedPurpose) setPurpose(savedPurpose);
  }, []);

  // Persist form data to local storage on change
  useEffect(() => {
    localStorage.setItem('vis_reg_name', visitorName);
    localStorage.setItem('vis_reg_id', visitorId);
    localStorage.setItem('vis_reg_plate', plateNumber);
    localStorage.setItem('vis_reg_purpose', purpose);
  }, [visitorName, visitorId, plateNumber, purpose]);

  const loadActiveVisitors = async () => {
      try {
          const visitors = await dbService.getActiveVisitors();
          setActiveVisitors(visitors.reverse());
      } catch (e) {
          console.error("Failed to load active visitors", e);
      }
  };

  const handleVisitorClick = (visitor: Visitor) => {
      setSelectedVisitor(visitor);
      setViewMode('details');
  };

  const handleCheckOut = async (visitor: Visitor) => {
      if (!visitor.id) return;
      if (window.confirm(`Check out ${visitor.name}?`)) {
          await dbService.checkOutVisitor(visitor.id);
          loadActiveVisitors();
          if (viewMode === 'details') {
              setSelectedVisitor(prev => prev ? ({
                  ...prev, 
                  status: 'Checked Out', 
                  outTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
              }) : null);
          }
      }
  };

  const handleManualSearch = () => {
      if (!checkoutQuery) return;
      const lowerQ = checkoutQuery.toLowerCase();
      const found = activeVisitors.find(v => 
          v.passId.toLowerCase().includes(lowerQ) || 
          (v.vehicle && v.vehicle.toLowerCase().includes(lowerQ)) || 
          v.name.toLowerCase().includes(lowerQ) ||
          (v.nric && v.nric.toLowerCase().includes(lowerQ))
      );
      
      if (found) {
          setCheckoutResult(found);
      } else {
          setCheckoutResult(null);
          alert("No active visitor found with those details.");
      }
  };

  const performManualCheckout = async () => {
      if (checkoutResult && checkoutResult.id) {
          await dbService.checkOutVisitor(checkoutResult.id);
          alert(`Successfully checked out ${checkoutResult.name}`);
          setCheckoutResult(null);
          setCheckoutQuery('');
          loadActiveVisitors();
          setViewMode('list');
      }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setCameraMode('idle');
    setIsRecordingVideo(false);
  };

  const startCamera = async (mode: CameraMode, specificFacing?: 'user' | 'environment') => {
    setCameraMode(mode);
    const targetFacing = specificFacing || (mode === 'face' ? 'user' : 'environment');
    setFacingMode(targetFacing);

    try {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: targetFacing,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: mode === 'face'
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    } catch (e) {
        console.error("Camera failed", e);
        alert("Camera access failed. Using simulation.");
        setCameraMode('idle');
        simulateCapture(mode);
    }
  };

  const toggleCameraFacing = () => {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      startCamera(cameraMode, newMode);
  };

  const simulateCapture = (mode: CameraMode) => {
      const color = mode === 'face' ? '#3b82f6' : mode === 'vehicle' ? '#f97316' : '#8b5cf6';
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = color;
          ctx.fillRect(0,0,300,300);
          ctx.fillStyle = 'white';
          ctx.font = '30px Arial';
          ctx.fillText(mode.toUpperCase(), 50, 150);
          const data = canvas.toDataURL('image/jpeg');
          
          if (mode === 'face') setFaceImage(data);
          if (mode === 'vehicle') setVehicleImage(data);
          if (mode === 'id-ocr') {
              setIdImage(data);
              simulateOCR();
          }
      }
  };

  const captureImage = async () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              if (facingMode === 'user') {
                  ctx.translate(canvas.width, 0);
                  ctx.scale(-1, 1);
              }
              ctx.drawImage(videoRef.current, 0, 0);
              const data = canvas.toDataURL('image/jpeg', 0.8);
              
              if (cameraMode === 'face') {
                  setFaceImage(data);
                  recordShortVideo();
              } else if (cameraMode === 'vehicle') {
                  setVehicleImage(data);
                  stopCamera();
              } else if (cameraMode === 'id-ocr') {
                  setIdImage(data);
                  setIsProcessingOCR(true);
                  stopCamera();
                  setTimeout(() => simulateOCR(), 1500);
              }
          }
      }
  };

  const recordShortVideo = () => {
      if (!streamRef.current) return;
      
      setIsRecordingVideo(true);
      chunksRef.current = [];
      
      try {
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
             ? 'video/webm;codecs=vp9' 
             : 'video/webm';
             
          const recorder = new MediaRecorder(streamRef.current, { mimeType });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  chunksRef.current.push(event.data);
              }
          };

          recorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'video/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  const base64data = reader.result as string;
                  setFaceVideo(base64data);
                  setIsRecordingVideo(false);
                  stopCamera(); 
              };
          };

          recorder.start();
          setTimeout(() => {
              if (recorder.state === 'recording') {
                  recorder.stop();
              }
          }, 3000);

      } catch (e) {
          console.error("Recording failed", e);
          setIsRecordingVideo(false);
          stopCamera();
      }
  };

  const simulateOCR = () => {
      setVisitorName("MUHAMMAD AMIRUL BIN ROSLI");
      setVisitorId("900101-14-5566");
      setPlateNumber("VAG 8821"); 
      setIsProcessingOCR(false);
      
      if (!faceImage) {
          setFaceImage(idImage); 
      }
  };

  const handleSaveRegistration = async () => {
      if (!visitorName) {
          alert("Visitor Name is required");
          return;
      }
      
      const newVisitor: Visitor = {
          name: visitorName,
          nric: visitorId,
          vehicle: plateNumber,
          purpose: purpose || 'General', 
          passId: `V-${Math.floor(Math.random() * 1000)}`,
          inTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: 'Active',
          photos: {
              face: faceImage || undefined,
              vehicle: vehicleImage || undefined,
              id: idImage || undefined,
              faceVideo: faceVideo || undefined
          }
      };

      await dbService.checkInVisitor(newVisitor);
      alert("Visitor Registered Successfully!");
      
      localStorage.removeItem('vis_reg_name');
      localStorage.removeItem('vis_reg_id');
      localStorage.removeItem('vis_reg_plate');
      localStorage.removeItem('vis_reg_purpose');

      setViewMode('list');
      loadActiveVisitors(); 

      setVisitorName('');
      setPlateNumber('');
      setVisitorId('');
      setPurpose('');
      setFaceImage(null);
      setFaceVideo(null);
      setVehicleImage(null);
      setIdImage(null);
  };

  // --- RENDER HELPERS ---

  const CameraOverlay = () => (
      <div className="absolute inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1 bg-black">
              <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror-mode' : ''}`}
                  style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
              />
              
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {cameraMode === 'face' && !isRecordingVideo && <div className="w-64 h-64 border-2 border-blue-500 rounded-full opacity-70"></div>}
                  {cameraMode === 'vehicle' && <div className="w-80 h-48 border-2 border-orange-500 rounded-lg opacity-70"></div>}
                  {cameraMode === 'id-ocr' && (
                      <div className="w-80 h-52 border-2 border-purple-500 rounded-lg opacity-70 flex flex-col items-center justify-center bg-purple-500/10 backdrop-blur-[1px]">
                           <ScanLine className="text-purple-200 w-full animate-pulse opacity-50 absolute" size={200} strokeWidth={0.5} />
                           <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded mt-20">Align ID / License / Passport</span>
                      </div>
                  )}
                  
                  {isRecordingVideo && (
                      <div className="absolute top-8 flex flex-col items-center animate-pulse">
                          <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                              <span className="text-white font-bold text-xs uppercase">Recording Video...</span>
                          </div>
                          <p className="text-white text-[10px] mt-2 bg-black/50 px-2 rounded">Keep visitor in frame</p>
                      </div>
                  )}
              </div>

              <button 
                  onClick={stopCamera}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full z-20"
              >
                  <X size={24} />
              </button>

              <button 
                  onClick={toggleCameraFacing}
                  className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full z-20"
              >
                  <RotateCcw size={24} />
              </button>
          </div>
          
          <div className="h-32 bg-black flex items-center justify-center space-x-8">
              {!isRecordingVideo ? (
                  <button 
                      onClick={captureImage}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                  >
                      <div className="w-16 h-16 bg-white rounded-full"></div>
                  </button>
              ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-red-600 flex items-center justify-center">
                      <div className="w-10 h-10 bg-red-600 rounded"></div>
                  </div>
              )}
          </div>
      </div>
  );

  const ModeSelectionModal = () => (
      <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 space-y-4 ${theme === 'black' ? 'bg-neutral-900 text-white' : 'bg-white text-black'}`}>
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">Select Registration Mode</h3>
                  <button onClick={() => setViewMode('list')}><X size={24} /></button>
              </div>

              <button className={`w-full p-4 rounded-xl border flex items-center space-x-4 ${cardBg} opacity-50 cursor-not-allowed`}>
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500"><User size={24} /></div>
                  <div className="text-left">
                      <span className="font-bold block">Manual Registration</span>
                      <span className="text-xs opacity-60">Type details manually</span>
                  </div>
              </button>

              <button className={`w-full p-4 rounded-xl border flex items-center space-x-4 ${cardBg} opacity-50 cursor-not-allowed`}>
                   <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><QrCode size={24} /></div>
                  <div className="text-left">
                      <span className="font-bold block">Auto Registration</span>
                      <span className="text-xs opacity-60">Via QR / Pre-reg</span>
                  </div>
              </button>

              <button 
                onClick={() => setViewMode('test-reg')}
                className={`w-full p-4 rounded-xl border flex items-center space-x-4 border-purple-500/50 hover:bg-purple-500/5 ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-50'}`}
              >
                   <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500"><Smartphone size={24} /></div>
                  <div className="text-left">
                      <span className="font-bold block">Test Registration</span>
                      <span className="text-xs opacity-60">OCR & Camera Demo</span>
                  </div>
              </button>
          </div>
      </div>
  );

  // --- VIEW: LIST (Default) ---
  if (viewMode === 'list' || viewMode === 'mode-select') {
      return (
        <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} relative`}>
            {/* Header */}
            <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg leading-tight">Visitor Management</h1>
                    <span className="text-[10px] opacity-60">FRONT DESK CONTROL</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setViewMode('mode-select')}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 border active:scale-95 transition-all ${theme === 'black' ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}
                    >
                        <div className={`p-3 rounded-full ${theme === 'black' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                            <UserPlus size={24} />
                        </div>
                        <span className="text-sm font-bold">Check-In</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('checkout')}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 border active:scale-95 transition-all ${theme === 'black' ? 'bg-orange-900/20 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}
                    >
                        <div className={`p-3 rounded-full ${theme === 'black' ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                            <LogOut size={24} />
                        </div>
                        <span className="text-sm font-bold">Check-Out</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                    <input 
                        placeholder="Search visitor name, vehicle..." 
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none ${inputBg}`}
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100">
                        <QrCode size={18} />
                    </button>
                </div>

                {/* Visitor List */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-sm font-bold opacity-70 uppercase tracking-wider">Active Visitors ({activeVisitors.length})</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {activeVisitors.length === 0 ? (
                            <div className="text-center py-10 opacity-30 text-xs">No active visitors.</div>
                        ) : (
                            activeVisitors.map(v => (
                                <div 
                                    key={v.id} 
                                    onClick={() => handleVisitorClick(v)}
                                    className={`p-4 rounded-xl border ${cardBg} flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-colors`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${theme === 'black' ? 'bg-neutral-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                            {v.photos?.face ? (
                                                <img src={v.photos.face} alt="Face" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">{v.name}</h4>
                                            <div className="flex items-center space-x-2 text-xs opacity-60 mt-0.5">
                                                <span className="font-mono bg-white/10 px-1 rounded">{v.passId}</span>
                                                <span>•</span>
                                                <span>{v.purpose}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleCheckOut(v); }}
                                          className="mb-1 text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 z-10"
                                        >
                                            Check Out
                                        </button>
                                         <div className="flex items-center space-x-1 text-xs text-green-500 font-medium bg-green-500/10 px-2 py-1 rounded-lg">
                                            <Clock size={12} />
                                            <span>{v.inTime}</span>
                                         </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
            
            {viewMode === 'mode-select' && <ModeSelectionModal />}
        </div>
      );
  }

  // --- VIEW: VISITOR DETAILS ---
  if (viewMode === 'details' && selectedVisitor) {
      return (
          <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} relative`}>
            {/* Header */}
            <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
                <button onClick={() => setViewMode('list')} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg leading-tight">Visitor Details</h1>
                    <span className="text-[10px] opacity-60 uppercase">{selectedVisitor.passId}</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Media Gallery */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Video Recording */}
                    {selectedVisitor.photos?.faceVideo && (
                        <div className="col-span-2 aspect-video rounded-2xl overflow-hidden bg-black relative border border-gray-500/20">
                            <video 
                                src={selectedVisitor.photos.faceVideo}
                                controls
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-white flex items-center space-x-1">
                                <Video size={10} />
                                <span>VIDEO RECORDING</span>
                            </div>
                        </div>
                    )}

                    {/* Face Photo */}
                    <div className={`${selectedVisitor.photos?.faceVideo ? 'col-span-1' : 'col-span-2 aspect-square'} rounded-xl overflow-hidden border relative ${cardBg}`}>
                        {selectedVisitor.photos?.face ? (
                            <img src={selectedVisitor.photos.face} alt="Face" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
                                <User size={48} />
                                <span className="text-xs mt-2">No Face Data</span>
                            </div>
                        )}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[8px] font-bold rounded">FACE PHOTO</div>
                    </div>

                    {/* ID Card */}
                    <div className={`aspect-[3/2] rounded-xl overflow-hidden border relative ${cardBg}`}>
                         {selectedVisitor.photos?.id ? (
                             <img src={selectedVisitor.photos.id} alt="ID" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                                 <CreditCard size={24} />
                                 <span className="text-[10px] mt-1">NO ID SCAN</span>
                             </div>
                         )}
                         <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[8px] font-bold rounded">ID DOC</div>
                    </div>

                    {/* Vehicle */}
                    <div className={`aspect-[3/2] rounded-xl overflow-hidden border relative ${cardBg}`}>
                         {selectedVisitor.photos?.vehicle ? (
                             <img src={selectedVisitor.photos.vehicle} alt="Vehicle" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                                 <Car size={24} />
                                 <span className="text-[10px] mt-1">NO VEHICLE</span>
                             </div>
                         )}
                         <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[8px] font-bold rounded">VEHICLE</div>
                    </div>
                </div>

                {/* Details Card */}
                <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4 max-w-[70%]">
                             <div className={`w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border ${theme === 'black' ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-100 border-gray-200'}`}>
                                 {selectedVisitor.photos?.face ? (
                                     <img src={selectedVisitor.photos.face} alt="Face" className="w-full h-full object-cover" />
                                 ) : (
                                     <User size={28} className="opacity-40" />
                                 )}
                             </div>
                             <div>
                                <h2 className="text-lg font-bold leading-tight break-words">{selectedVisitor.name}</h2>
                                <p className="text-xs opacity-60 font-mono mt-0.5">{selectedVisitor.nric || 'No ID Number'}</p>
                            </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase whitespace-nowrap ${
                            selectedVisitor.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                            {selectedVisitor.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-500/10">
                        <div>
                            <p className="text-[10px] opacity-50 uppercase font-bold">Purpose</p>
                            <p className="font-medium text-sm">{selectedVisitor.purpose}</p>
                        </div>
                        <div>
                            <p className="text-[10px] opacity-50 uppercase font-bold">Vehicle No</p>
                            <p className="font-mono font-bold">{selectedVisitor.vehicle || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] opacity-50 uppercase font-bold">Pass ID</p>
                            <p className="font-mono font-bold">{selectedVisitor.passId}</p>
                        </div>
                        <div>
                            <p className="text-[10px] opacity-50 uppercase font-bold">Time In</p>
                            <p className="font-mono text-green-500">{selectedVisitor.inTime}</p>
                        </div>
                        <div>
                             <p className="text-[10px] opacity-50 uppercase font-bold">Time Out</p>
                             <p className="font-mono text-red-500">{selectedVisitor.outTime || '-'}</p>
                        </div>
                        <div>
                             <p className="text-[10px] opacity-50 uppercase font-bold">Date</p>
                             <p className="font-mono">{selectedVisitor.date}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {selectedVisitor.status === 'Active' ? (
                    <button 
                        onClick={() => handleCheckOut(selectedVisitor)}
                        className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
                    >
                        <LogOut size={20} />
                        <span>CHECK OUT VISITOR</span>
                    </button>
                ) : (
                    <div className="w-full py-4 rounded-xl bg-gray-500/10 text-gray-500 font-bold text-lg border border-gray-500/20 flex items-center justify-center space-x-2">
                        <CheckCircle2 size={20} />
                        <span>VISITOR CHECKED OUT</span>
                    </div>
                )}
            </main>
          </div>
      );
  }

  // --- VIEW: MANUAL CHECKOUT ---
  if (viewMode === 'checkout') {
      return (
        <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} relative`}>
            {/* Header */}
            <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
                <button onClick={() => setViewMode('list')} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg leading-tight">Manual Checkout</h1>
                    <span className="text-[10px] opacity-60">SEARCH & CHECKOUT</span>
                </div>
            </header>

            <main className="flex-1 p-6 space-y-6">
                 <div className="space-y-4">
                     <div className="text-center space-y-2 mb-6">
                         <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'black' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                             <LogOut size={32} />
                         </div>
                         <h2 className="text-xl font-bold">Checkout Visitor</h2>
                         <p className="text-sm opacity-60">Enter Pass ID, Name, or Vehicle Number to find active visitor.</p>
                     </div>

                     <div className="flex space-x-2">
                         <div className="relative flex-1">
                             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                             <input 
                               value={checkoutQuery}
                               onChange={(e) => setCheckoutQuery(e.target.value)}
                               placeholder="Pass ID / Vehicle / Name"
                               className={`w-full pl-11 pr-4 py-4 rounded-xl border outline-none font-bold ${inputBg}`}
                             />
                         </div>
                         <button 
                           onClick={handleManualSearch}
                           className="px-4 py-3 bg-blue-600 rounded-xl text-white font-bold"
                         >
                             <ArrowRight size={20} />
                         </button>
                     </div>
                 </div>

                 {/* Search Result */}
                 {checkoutResult && (
                     <div className={`p-6 rounded-2xl border animate-in slide-in-from-bottom-4 ${cardBg}`}>
                         <div className="flex items-center space-x-4 mb-6">
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                                 {checkoutResult.photos?.face ? (
                                     <img src={checkoutResult.photos.face} alt="Visitor" className="w-full h-full object-cover" />
                                 ) : (
                                     <User size={32} className="opacity-40" />
                                 )}
                             </div>
                             <div>
                                 <h3 className="text-xl font-bold">{checkoutResult.name}</h3>
                                 <div className="flex items-center space-x-2 text-sm opacity-60 mt-1">
                                     <span className="font-mono bg-white/10 px-1 rounded">{checkoutResult.passId}</span>
                                     <span>•</span>
                                     <span>{checkoutResult.vehicle || 'No Vehicle'}</span>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 mb-6">
                             <div className={`p-3 rounded-xl ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                                 <p className="text-[10px] font-bold opacity-50 uppercase">Time In</p>
                                 <p className="font-mono text-lg font-bold text-green-500">{checkoutResult.inTime}</p>
                             </div>
                             <div className={`p-3 rounded-xl ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                                 <p className="text-[10px] font-bold opacity-50 uppercase">Purpose</p>
                                 <p className="font-medium">{checkoutResult.purpose}</p>
                             </div>
                         </div>

                         <button 
                             onClick={performManualCheckout}
                             className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
                         >
                             <LogOut size={20} />
                             <span>CONFIRM CHECKOUT</span>
                         </button>
                     </div>
                 )}
            </main>
        </div>
      );
  }

  // --- VIEW: TEST REGISTRATION ---
  if (viewMode === 'test-reg') {
      return (
        <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} relative`}>
             {/* Camera Overlay */}
             {cameraMode !== 'idle' && <CameraOverlay />}
             
             {/* OCR Processing Overlay */}
             {isProcessingOCR && (
                 <div className="absolute inset-0 z-[90] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                     <div className="relative">
                         <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div>
                         <div className="relative bg-white p-4 rounded-full">
                            <Loader2 size={40} className="animate-spin text-blue-600" />
                         </div>
                     </div>
                     <div className="text-center">
                         <h3 className="text-xl font-bold text-white">Analyzing ID Document...</h3>
                         <p className="text-white/60 text-sm">Extracting Name, ID, and Face Data</p>
                     </div>
                 </div>
             )}

            {/* Header */}
            <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
                <button onClick={() => setViewMode('list')} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg leading-tight">Test Visitor Registration</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center space-y-6">
                
                {/* 1. Face Placeholder */}
                <div className="flex flex-col items-center space-y-2 w-full">
                    <button 
                       onClick={() => startCamera('face')}
                       className={`w-32 h-32 rounded-full border-4 border-dashed flex items-center justify-center overflow-hidden relative shadow-lg active:scale-95 transition-transform ${faceImage ? 'border-green-500' : 'border-gray-500/30'} ${placeholderBg}`}
                    >
                        {faceImage ? (
                            <img src={faceImage} alt="Face" className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="opacity-20" />
                        )}
                        <div className="absolute bottom-2 right-2 p-1.5 bg-blue-600 rounded-full text-white shadow-md">
                            <Camera size={14} />
                        </div>
                        {faceVideo && (
                            <div className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-white animate-pulse">
                                <Video size={10} />
                            </div>
                        )}
                    </button>
                    <div className="w-full max-w-xs space-y-1">
                        <label className="text-[10px] font-bold opacity-50 uppercase ml-1">Visitor Name</label>
                        <input 
                           value={visitorName}
                           onChange={(e) => setVisitorName(e.target.value)}
                           placeholder="Scan ID or Enter Name"
                           className={`w-full px-4 py-3 rounded-xl border outline-none text-center font-bold text-lg ${inputBg}`}
                        />
                        {visitorId && <p className="text-center text-xs opacity-50 font-mono tracking-wider">{visitorId}</p>}
                    </div>
                </div>

                {/* 2. Vehicle Placeholder */}
                <div className="flex flex-col items-center space-y-2 w-full max-w-xs pt-4 border-t border-gray-500/10">
                    <button 
                       onClick={() => startCamera('vehicle')}
                       className={`w-full h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden relative shadow-sm active:scale-95 transition-transform ${vehicleImage ? 'border-green-500' : 'border-gray-500/30'} ${placeholderBg}`}
                    >
                         {vehicleImage ? (
                            <img src={vehicleImage} alt="Vehicle" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center opacity-30">
                                <Car size={32} />
                                <span className="text-[10px] mt-1 font-bold">VEHICLE PHOTO</span>
                            </div>
                        )}
                         <div className="absolute bottom-2 right-2 p-1.5 bg-orange-600 rounded-full text-white shadow-md">
                            <Camera size={14} />
                        </div>
                    </button>
                    <div className="w-full space-y-1">
                        <label className="text-[10px] font-bold opacity-50 uppercase ml-1">Plate Number</label>
                        <input 
                           value={plateNumber}
                           onChange={(e) => setPlateNumber(e.target.value)}
                           placeholder="ABC 1234"
                           className={`w-full px-4 py-3 rounded-xl border outline-none text-center font-bold font-mono tracking-wider ${inputBg}`}
                        />
                    </div>
                </div>

                {/* 3. Purpose & OCR */}
                <div className="w-full max-w-xs space-y-4 pt-4 border-t border-gray-500/10">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold opacity-50 uppercase ml-1">Purpose of Visit</label>
                        <input 
                           value={purpose}
                           onChange={(e) => setPurpose(e.target.value)}
                           placeholder="e.g. Delivery, Meeting, Contractor"
                           className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${inputBg}`}
                        />
                    </div>

                    <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
                        <div className="flex items-center space-x-2 opacity-70 justify-center">
                             <CreditCard size={14} />
                             <span className="text-[10px] font-bold uppercase">Supported Documents</span>
                        </div>
                        <div className="flex justify-center space-x-2 opacity-50">
                             <span className="text-[10px] bg-gray-500/10 px-2 py-1 rounded">MyKad</span>
                             <span className="text-[10px] bg-gray-500/10 px-2 py-1 rounded">Passport</span>
                             <span className="text-[10px] bg-gray-500/10 px-2 py-1 rounded">CIDB</span>
                             <span className="text-[10px] bg-gray-500/10 px-2 py-1 rounded">Driving Lic.</span>
                        </div>
                        
                        <button 
                           onClick={() => startCamera('id-ocr')}
                           className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                        >
                            <ScanLine size={20} />
                            <span>SCAN ID (OCR)</span>
                        </button>
                    </div>
                </div>

            </main>

            {/* Footer Save */}
            <div className={`p-4 border-t ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
                 <button 
                    onClick={handleSaveRegistration}
                    className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
                 >
                     <Save size={20} />
                     <span>SAVE REGISTRATION</span>
                 </button>
            </div>
        </div>
      );
  }

  return null;
};