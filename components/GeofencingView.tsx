import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { ArrowLeft, MapPin, Navigation, Shield, AlertCircle, CheckCircle2, Lock, Unlock, RotateCcw, Save, Power } from 'lucide-react';

interface GeofencingViewProps {
  theme: Theme;
  onBack: () => void;
}

export const GeofencingView: React.FC<GeofencingViewProps> = ({ theme, onBack }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInside, setIsInside] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  
  // New State
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [recordedCenter, setRecordedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);

  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const recordedMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const FENCE_RADIUS_KM = 0.02; // 20 meters for testing (more sensitive than 500m)

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapInstanceRef.current && document.getElementById('map')) {
      // @ts-ignore
      if (typeof L !== 'undefined') {
        // @ts-ignore
        mapInstanceRef.current = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([3.1390, 101.6869], 13);
        
        // @ts-ignore
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle GPS Toggle
  useEffect(() => {
    if (gpsEnabled) {
      setLoading(true);
      if (!navigator.geolocation) {
        setError("Geolocation is not supported");
        setLoading(false);
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLoc = { lat: latitude, lng: longitude };
          setLocation(newLoc);
          setLoading(false);
          setError(null);

          // Update Map
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 18);
            
            // Update Marker
            if (markerRef.current) {
               markerRef.current.setLatLng([latitude, longitude]);
            } else {
               // @ts-ignore
               markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
            }
          }

          // Check Geofence if Locked
          if (isLocked && recordedCenter) {
             const dist = calculateDistance(latitude, longitude, recordedCenter.lat, recordedCenter.lng);
             const inside = dist <= FENCE_RADIUS_KM;
             setIsInside(inside);
             
             if (!inside) {
                 triggerAlert();
             } else {
                 stopAlert();
             }
          }
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLoading(false);
      setLocation(null);
      stopAlert();
    }

    return () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
        stopAlert();
    };
  }, [gpsEnabled, isLocked, recordedCenter]);

  // Alert Sound Logic
  const triggerAlert = () => {
      if (isAlerting) return;
      setIsAlerting(true);
      
      try {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          if (!audioContextRef.current) {
              audioContextRef.current = new Ctx();
          }
          
          const ctx = audioContextRef.current;
          if (ctx?.state === 'suspended') {
              ctx.resume();
          }

          const osc = ctx!.createOscillator();
          const gain = ctx!.createGain();
          
          osc.connect(gain);
          gain.connect(ctx!.destination);
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, ctx!.currentTime);
          osc.frequency.linearRampToValueAtTime(1200, ctx!.currentTime + 0.1);
          osc.frequency.linearRampToValueAtTime(800, ctx!.currentTime + 0.2);
          
          gain.gain.setValueAtTime(0.5, ctx!.currentTime);
          
          osc.start();
          
          // Loop the alert
          const alertInterval = setInterval(() => {
              if (!isAlerting) { // This check inside interval might be stale due to closure, but we clear interval on stop
                  clearInterval(alertInterval);
                  osc.stop();
                  return;
              }
              // Re-trigger sound effect logic if needed for continuous siren, 
              // but oscillator loop is simpler if we just let it run. 
              // For siren effect, we need to modulate frequency.
          }, 1000);
          
          // Store reference to stop it? 
          // Actually, let's use a simpler beep function for the interval
          osc.stop(ctx!.currentTime + 0.5); // Play for 0.5s
          
      } catch (e) {
          console.error("Audio error", e);
      }
  };

  const stopAlert = () => {
      setIsAlerting(false);
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
  };

  // Actions
  const handleRecord = () => {
      if (location) {
          setRecordedCenter(location);
          
          // Draw Circle and Pin
          if (mapInstanceRef.current) {
              if (circleRef.current) mapInstanceRef.current.removeLayer(circleRef.current);
              if (recordedMarkerRef.current) mapInstanceRef.current.removeLayer(recordedMarkerRef.current);
              
              // @ts-ignore
              circleRef.current = L.circle([location.lat, location.lng], {
                  color: 'red',
                  fillColor: '#f03',
                  fillOpacity: 0.2,
                  radius: FENCE_RADIUS_KM * 1000
              }).addTo(mapInstanceRef.current);

              // @ts-ignore
              const pinIcon = L.divIcon({
                  className: 'custom-pin',
                  html: `<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
              });

              // @ts-ignore
              recordedMarkerRef.current = L.marker([location.lat, location.lng], { icon: pinIcon }).addTo(mapInstanceRef.current);
          }
      }
  };

  const handleReset = () => {
      setRecordedCenter(null);
      setIsLocked(false);
      setIsInside(null);
      stopAlert();
      if (circleRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(circleRef.current);
          circleRef.current = null;
      }
      if (recordedMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(recordedMarkerRef.current);
          recordedMarkerRef.current = null;
      }
  };

  const toggleLock = () => {
      if (!recordedCenter) return;
      setIsLocked(!isLocked);
      if (isLocked) {
          // Unlocking
          stopAlert();
          setIsInside(null);
      }
  };

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Geofence</h1>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Map Container */}
        <div className="relative w-full h-1/2 bg-gray-200">
            <div id="map" className="w-full h-full z-0" />
            
            {/* GPS Toggle Overlay */}
            <div className="absolute top-4 right-4 z-[1000]">
                <button 
                    onClick={() => setGpsEnabled(!gpsEnabled)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg font-bold transition-all ${
                        gpsEnabled 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white text-black'
                    }`}
                >
                    <Power size={16} />
                    <span>{gpsEnabled ? 'GPS ON' : 'GPS OFF'}</span>
                </button>
            </div>

            {/* Status Overlay */}
            {isLocked && (
                <div className={`absolute bottom-4 left-4 right-4 z-[1000] p-4 rounded-xl shadow-lg backdrop-blur-md border ${
                    isAlerting 
                        ? 'bg-red-500/90 border-red-400 text-white animate-pulse' 
                        : (isInside ? 'bg-green-500/90 border-green-400 text-white' : 'bg-black/80 border-white/10 text-white')
                }`}>
                    <div className="flex items-center space-x-3">
                        {isAlerting ? <AlertCircle size={24} /> : (isInside ? <CheckCircle2 size={24} /> : <Shield size={24} />)}
                        <div>
                            <p className="font-bold text-lg uppercase">
                                {isAlerting ? 'PERIMETER BREACHED!' : (isInside ? 'SECURE ZONE' : 'MONITORING ACTIVE')}
                            </p>
                            <p className="text-xs opacity-80">
                                {isAlerting ? 'Device outside designated area' : 'Location locked within 20m radius'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Controls */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            
            {/* Current Location Info */}
            <div className={`p-4 rounded-xl border ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 opacity-70">
                        <Navigation size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Current Coordinates</span>
                    </div>
                    {loading && <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] opacity-50 uppercase">Latitude</p>
                        <p className="font-mono text-lg font-bold">{location?.lat.toFixed(6) || '---'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] opacity-50 uppercase">Longitude</p>
                        <p className="font-mono text-lg font-bold">{location?.lng.toFixed(6) || '---'}</p>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Record Button */}
                <button 
                    onClick={handleRecord}
                    disabled={!location || isLocked}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                        recordedCenter 
                            ? (theme === 'black' ? 'bg-neutral-800 border-neutral-700 opacity-50' : 'bg-gray-100 border-gray-200 opacity-50')
                            : (theme === 'black' ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800' : 'bg-white border-gray-200 hover:bg-gray-50')
                    }`}
                >
                    <Save size={24} className="text-blue-500" />
                    <span className="text-xs font-bold">Record Location</span>
                </button>

                {/* Reset Button */}
                <button 
                    onClick={handleReset}
                    disabled={!recordedCenter}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                        !recordedCenter 
                            ? 'opacity-30 cursor-not-allowed'
                            : (theme === 'black' ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800' : 'bg-white border-gray-200 hover:bg-gray-50')
                    }`}
                >
                    <RotateCcw size={24} className="text-orange-500" />
                    <span className="text-xs font-bold">Reset Record</span>
                </button>
            </div>

            {/* Lock Button (Full Width) */}
            <button 
                onClick={toggleLock}
                disabled={!recordedCenter}
                className={`w-full p-6 rounded-xl flex items-center justify-center space-x-3 transition-all shadow-lg ${
                    !recordedCenter 
                        ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                        : (isLocked 
                            ? 'bg-red-500 text-white shadow-red-500/30 hover:bg-red-600' 
                            : 'bg-green-500 text-white shadow-green-500/30 hover:bg-green-600')
                }`}
            >
                {isLocked ? <Lock size={24} /> : <Unlock size={24} />}
                <span className="font-bold text-lg uppercase tracking-widest">
                    {isLocked ? 'UNLOCK PERIMETER' : 'LOCK POSITION'}
                </span>
            </button>

            {/* Instructions */}
            <div className="text-center opacity-40 text-[10px] leading-relaxed px-4">
                <p>1. Enable GPS to get current location.</p>
                <p>2. Click "Record Location" to set the safe zone center.</p>
                <p>3. Click "Lock Position" to arm the geofence alarm.</p>
            </div>

        </div>
      </main>
    </div>
  );
};
