import React, { useState, useRef, useEffect } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Save, Camera, Video, RotateCcw, Loader2, CheckCircle2, X } from 'lucide-react';
import { dbService } from '../services/db';

interface LogbookViewProps {
  theme: Theme;
  onBack: () => void;
}

export const LogbookView: React.FC<LogbookViewProps> = ({ theme, onBack }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [reason, setReason] = useState('');
  
  // Media State
  const [mediaData, setMediaData] = useState<string | null>(null); // Base64
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Theme Config
  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'black' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-300';

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true // Needed for video recording
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera access failed", e);
      alert("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        setMediaData(data);
        setMediaType('image');
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    setIsRecording(true);
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

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setMediaData(reader.result as string);
          setMediaType('video');
          setIsRecording(false);
          stopCamera(); // Stop camera preview to show result
        };
      };

      recorder.start();
    } catch (e) {
      console.error("Recording failed", e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetake = () => {
    setMediaData(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason.");
      return;
    }

    setLoading(true);
    try {
      await dbService.saveLogbookEntry(reason, mediaData || undefined, mediaType);
      
      // Visual feedback
      alert("Logbook entry saved successfully!");
      onBack();
    } catch (e) {
      console.error("Failed to save logbook", e);
      alert("Error saving logbook. Please try again.");
    } finally {
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
        <h1 className="font-bold text-lg">Logbook</h1>
      </header>

      <main className="flex-1 p-4 overflow-y-auto space-y-6">
        
        {/* Camera / Preview Section */}
        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black relative border border-gray-500/20 shadow-lg">
          {!mediaData ? (
            <>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              {/* Controls Overlay */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-6">
                 {/* Mode Switcher */}
                 {!isRecording && (
                    <div className="flex bg-black/50 backdrop-blur rounded-full p-1 border border-white/10">
                       <button 
                         onClick={() => setMode('photo')}
                         className={`p-2 rounded-full transition-all ${mode === 'photo' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                       >
                         <Camera size={18} />
                       </button>
                       <button 
                         onClick={() => setMode('video')}
                         className={`p-2 rounded-full transition-all ${mode === 'video' ? 'bg-red-500 text-white' : 'text-white hover:bg-white/10'}`}
                       >
                         <Video size={18} />
                       </button>
                    </div>
                 )}

                 {/* Trigger Button */}
                 {mode === 'photo' ? (
                   <button 
                     onClick={captureImage}
                     className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition-transform"
                   >
                     <div className="w-12 h-12 bg-white rounded-full"></div>
                   </button>
                 ) : (
                   <button 
                     onClick={isRecording ? stopRecording : startRecording}
                     className={`w-16 h-16 rounded-full border-4 ${isRecording ? 'border-red-500 bg-red-500/20' : 'border-white bg-white/20'} flex items-center justify-center active:scale-95 transition-transform`}
                   >
                     {isRecording ? (
                       <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
                     ) : (
                       <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                     )}
                   </button>
                 )}
              </div>

              {isRecording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 rounded-full flex items-center space-x-2 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-white text-xs font-bold">REC</span>
                </div>
              )}
            </>
          ) : (
             <div className="relative w-full h-full">
                {mediaType === 'image' ? (
                  <img src={mediaData} alt="Captured" className="w-full h-full object-contain bg-black" />
                ) : (
                  <video src={mediaData} controls className="w-full h-full object-contain bg-black" />
                )}
                <button 
                  onClick={handleRetake}
                  className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full backdrop-blur hover:bg-black/80"
                >
                   <RotateCcw size={20} />
                </button>
                <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 rounded text-xs text-white font-bold uppercase">
                   {mediaType} captured
                </div>
             </div>
          )}
        </div>

        {/* Input Section */}
        <div className={`p-4 rounded-2xl border space-y-3 ${cardBg}`}>
            <label className="text-xs font-bold opacity-50 uppercase ml-1">Reason cannot do clocking out inbox</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter details regarding missing clocking entry..."
              className={`w-full h-32 p-4 rounded-xl border outline-none resize-none ${inputBg}`}
            />
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
             <Loader2 size={24} className="animate-spin" />
          ) : (
             <>
               <Save size={20} />
               <span>Submit Logbook</span>
             </>
          )}
        </button>

      </main>
    </div>
  );
};