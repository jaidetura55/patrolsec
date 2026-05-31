import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Shield, MapPin, Power, Crosshair, Navigation, Globe, Clock, AlertTriangle, Info, Lock, Volume2, VolumeX, Unlock, Map as MapIcon, MousePointer2, MessageCircle, Zap, Video, FileWarning } from 'lucide-react';
import { dbService } from '../services/db';

const INTERVAL_OPTIONS = [
  { label: '1 Minute', value: 1 },
  { label: '5 Minutes', value: 5 },
  { label: '15 Minutes', value: 15 },
  { label: '30 Minutes', value: 30 },
  { label: '1 Hour', value: 60 },
  { label: '3 Hours', value: 180 },
  { label: '12 Hours', value: 720 },
];

const CALLMEBOT_PHONE = "+60139390145";
const CALLMEBOT_API_KEY = "8706019";

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in meters
  return d;
}

interface AntitheftViewProps {
  theme: Theme;
  onBack: () => void;
}

export const AntitheftView: React.FC<AntitheftViewProps> = ({ theme, onBack }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lockedPosition, setLockedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [address, setAddress] = useState<string>('Waiting for GPS...');
  const [lastUpdate, setLastUpdate] = useState<string>('-');
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | 'unknown'>('unknown');
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  // New features
  const [isManualMode, setIsManualMode] = useState(false);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const lockMarkerRef = useRef<any>(null); // Marker for the locked position
  const circleRef = useRef<any>(null); // Circle for the 10m radius
  const polylineRef = useRef<any>(null); // Line for movement path

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'black' ? 'bg-neutral-800' : 'bg-white';

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
       if (typeof window !== 'undefined' && (window as any).L) {
          const L = (window as any).L;
          const map = L.map(mapContainerRef.current, {
              center: [3.1390, 101.6869], // Default KL
              zoom: 13,
              zoomControl: false,
              attributionControl: false
          });

          // Use CartoDB Dark Matter for black theme, Positron for white
          const tileLayer = theme === 'black' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

          L.tileLayer(tileLayer, {
              attribution: '',
              maxZoom: 20
          }).addTo(map);

          mapInstanceRef.current = map;
       }
    }

    // Check permissions
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            setPermissionStatus(result.state);
            result.onchange = () => setPermissionStatus(result.state);
        });
    }

    // Restore state from local storage
    const savedTracking = localStorage.getItem('antitheft_tracking') === 'true';
    const savedInterval = parseInt(localStorage.getItem('antitheft_interval') || '1');
    const savedLat = localStorage.getItem('antitheft_lock_lat');
    const savedLng = localStorage.getItem('antitheft_lock_lng');

    if (savedTracking && savedLat && savedLng) {
        setLockedPosition({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
    }

    setIsTracking(savedTracking);
    setIntervalMinutes(savedInterval);
    
    // Load Incidents
    loadIncidents();

    return () => {
       stopTracking(true); // Stop tracking but don't necessarily clear persistence if unmounting
       stopAlarm();
       if (mapInstanceRef.current) {
           mapInstanceRef.current.remove();
           mapInstanceRef.current = null;
       }
    };
  }, []);

  const loadIncidents = async () => {
      try {
          const data = await dbService.getCloneIncidents();
          setIncidents(data.reverse());
      } catch (e) {
          console.error("Failed to load incidents", e);
      }
  };

  // Map Click Listener Update
  useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const clickHandler = (e: any) => {
          if (isManualMode && !isTracking) {
              const { lat, lng } = e.latlng;
              setLockedPosition({ lat, lng });
              // Vibration feedback
              if (navigator.vibrate) navigator.vibrate(50);
          }
      };

      map.off('click');
      map.on('click', clickHandler);

      return () => {
          map.off('click', clickHandler);
      };
  }, [isManualMode, isTracking]);

  // Handle Tracking Effect
  useEffect(() => {
    if (isTracking) {
        startTracking();
    } else {
        stopTracking(false);
    }
  }, [isTracking]);

  // Update Sync Interval dynamically
  useEffect(() => {
      if (isTracking) {
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
          const ms = intervalMinutes * 60 * 1000;
          intervalIdRef.current = window.setInterval(() => {
              if (location) {
                  dbService.logAction('GPS_SYNC', `${location.lat}, ${location.lng} (Auto-Sync)`);
              }
          }, ms);
      }
  }, [intervalMinutes, isTracking, location]);

  // Effect to re-render markers
  useEffect(() => {
      // Trigger UI update whenever locations change
      if (mapInstanceRef.current && (window as any).L) {
          const L = (window as any).L;
          const map = mapInstanceRef.current;

          // 1. Current Position Marker (Blue Dot)
          if (location) {
              if (!markerRef.current) {
                   const icon = L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                  });
                  markerRef.current = L.marker([location.lat, location.lng], { icon }).addTo(map);
              } else {
                  markerRef.current.setLatLng([location.lat, location.lng]);
              }
          }

          // 2. Lock Marker & Circle (Red Pin 📍)
          // Show if locked OR manual mode is on
          if (lockedPosition) {
              if (!lockMarkerRef.current) {
                  const lockIcon = L.divIcon({
                      className: 'lock-icon',
                      html: `<div style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform: translate(-50%, -100%);">📍</div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 32] 
                  });
                  lockMarkerRef.current = L.marker([lockedPosition.lat, lockedPosition.lng], { 
                      icon: lockIcon,
                      draggable: isManualMode && !isTracking
                  }).addTo(map);
                  
                  // Drag event
                  lockMarkerRef.current.on('dragend', (e: any) => {
                      if (!isTracking) { // Double check safety
                          const { lat, lng } = e.target.getLatLng();
                          setLockedPosition({ lat, lng });
                      }
                  });

                  // 10m Safety Zone
                  circleRef.current = L.circle([lockedPosition.lat, lockedPosition.lng], {
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.1,
                      weight: 1,
                      radius: 10
                  }).addTo(map);

              } else {
                  lockMarkerRef.current.setLatLng([lockedPosition.lat, lockedPosition.lng]);
                  // Update draggable state
                  if (lockMarkerRef.current.dragging) {
                      if (isManualMode && !isTracking) lockMarkerRef.current.dragging.enable();
                      else lockMarkerRef.current.dragging.disable();
                  }

                  if (circleRef.current) {
                      circleRef.current.setLatLng([lockedPosition.lat, lockedPosition.lng]);
                  }
              }
          } else {
              // Cleanup if no locked position
              if (lockMarkerRef.current) {
                  map.removeLayer(lockMarkerRef.current);
                  lockMarkerRef.current = null;
              }
              if (circleRef.current) {
                  map.removeLayer(circleRef.current);
                  circleRef.current = null;
              }
          }

          // 3. Movement Path (Polyline)
          if (isTracking && lockedPosition && pathHistory.length > 0) {
              // Include the locked position as the start of the path visual
              const pathPoints = [[lockedPosition.lat, lockedPosition.lng], ...pathHistory];
              
              if (!polylineRef.current) {
                  polylineRef.current = L.polyline(pathPoints, {
                      color: 'red',
                      weight: 3,
                      opacity: 0.7,
                      dashArray: '5, 10'
                  }).addTo(map);
              } else {
                  polylineRef.current.setLatLngs(pathPoints);
              }
          } else {
              if (polylineRef.current) {
                  map.removeLayer(polylineRef.current);
                  polylineRef.current = null;
              }
          }

          // View Fitting logic (only on significant changes or init)
          // We generally want to follow the user, or show both
      }
  }, [location, lockedPosition, isManualMode, isTracking, pathHistory]);

  const updateLocationLogic = (lat: number, lng: number) => {
      setLocation({ lat, lng });
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Update path history if tracking
      if (isTracking) {
          setPathHistory(prev => [...prev, [lat, lng]]);
      }

      // Reverse Geocode
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
              if (data && data.display_name) {
                  setAddress(data.display_name);
              }
          })
          .catch(e => console.warn("Geocoding failed", e));
  };

  const sendCallMeBotAlert = async (text: string) => {
    try {
        const encodedText = encodeURIComponent(text);
        // Using no-cors mode to fire the request without needing CORS headers from the server
        const url = `https://api.callmebot.com/whatsapp.php?phone=${CALLMEBOT_PHONE}&text=${encodedText}&apikey=${CALLMEBOT_API_KEY}`;
        await fetch(url, { mode: 'no-cors' });
        console.log("CallMeBot trigger sent");
    } catch (e) {
        console.error("CallMeBot error", e);
    }
  };

  const checkDistance = (currentLat: number, currentLng: number) => {
      if (lockedPosition) {
          const dist = getDistanceFromLatLonInMeters(lockedPosition.lat, lockedPosition.lng, currentLat, currentLng);
          setDistance(Math.round(dist));
          
          if (dist > 10) {
              if (!isAlarmActive) {
                  startAlarm();
                  dbService.logAction('ANTITHEFT_ALARM', `Movement detected: ${Math.round(dist)}m from lock position.`);
                  // Trigger CallMeBot Alert
                  sendCallMeBotAlert(`🚨 *THEFT DETECTED!*\n\nDevice moved ${Math.round(dist)} meters from locked position.\nCurrent Location: ${currentLat}, ${currentLng}\nTime: ${new Date().toLocaleTimeString()}`);
              }
          }
      } else {
          // Auto-lock if not set (fallback)
          const newLock = { lat: currentLat, lng: currentLng };
          setLockedPosition(newLock);
          localStorage.setItem('antitheft_lock_lat', currentLat.toString());
          localStorage.setItem('antitheft_lock_lng', currentLng.toString());
      }
  };

  const startTracking = () => {
      if (!navigator.geolocation) {
          alert("GPS not supported");
          setIsTracking(false);
          return;
      }

      // 1. Get initial position if not manually locked
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const { latitude, longitude } = pos.coords;
              updateLocationLogic(latitude, longitude);
              
              // Lock position if not already set by Manual Mode or persistence
              if (!lockedPosition) {
                  setLockedPosition({ lat: latitude, lng: longitude });
                  localStorage.setItem('antitheft_lock_lat', latitude.toString());
                  localStorage.setItem('antitheft_lock_lng', longitude.toString());
              }
          }, 
          (err) => console.error(err), 
          { enableHighAccuracy: true }
      );

      // 2. Start Watch
      if (watchIdRef.current === null) {
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                updateLocationLogic(latitude, longitude);
                checkDistance(latitude, longitude);
            },
            (err) => console.error("Watch GPS Error", err),
            { enableHighAccuracy: true, maximumAge: 0 }
        );
      }

      localStorage.setItem('antitheft_tracking', 'true');
      localStorage.setItem('antitheft_interval', intervalMinutes.toString());
  };

  const stopTracking = (isUnmounting = false) => {
      if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
      }
      
      if (!isUnmounting) {
          stopAlarm();
          setIsTracking(false);
          setLockedPosition(null);
          setDistance(0);
          setPathHistory([]); // Clear history
          localStorage.setItem('antitheft_tracking', 'false');
          localStorage.removeItem('antitheft_lock_lat');
          localStorage.removeItem('antitheft_lock_lng');
          
          // Clear map markers (handled by effect mostly, but manual clean here for safety)
      }
  };

  const toggleTracking = () => {
      // If turning ON, ensure we disable manual mode editing visually
      if (!isTracking) {
          setIsManualMode(false);
      }
      setIsTracking(!isTracking);
  };

  const requestPermission = () => {
      navigator.geolocation.getCurrentPosition(
          () => {
              setPermissionStatus('granted');
              alert("GPS Permission Granted");
          },
          (err) => {
              console.error(err);
              alert("Permission Denied: Please enable GPS in browser settings.");
          }
      );
  };

  // --- ALARM LOGIC ---
  const startAlarm = () => {
      try {
          if (audioCtxRef.current) return; // Already playing

          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new Ctx();
          audioCtxRef.current = ctx;

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();

          gain.gain.setValueAtTime(1.0, ctx.currentTime); 

          osc.type = 'sawtooth'; 
          osc.frequency.setValueAtTime(1000, ctx.currentTime);

          // Fast Siren LFO
          lfo.type = 'square';
          lfo.frequency.setValueAtTime(6, ctx.currentTime); 
          lfoGain.gain.setValueAtTime(500, ctx.currentTime); 

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          lfo.start();

          oscillatorRef.current = osc;
          setIsAlarmActive(true);
      } catch (e) {
          console.error("Audio API error:", e);
      }
  };

  const stopAlarm = () => {
      if (oscillatorRef.current) {
          try { oscillatorRef.current.stop(); } catch (e) {}
          oscillatorRef.current = null;
      }
      if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
      }
      setIsAlarmActive(false);
  };

  const handleTestSystem = () => {
      if (isAlarmActive) {
          stopAlarm();
      } else {
          startAlarm();
          sendCallMeBotAlert("🚨 *TEST ALERT*\nAntitheft system test initiated by user.");
          alert("Alarm started and Test Message sent to CallMeBot.");
      }
  };

  // Reset View to Lock & Current
  const focusView = () => {
      if (mapInstanceRef.current && location) {
          mapInstanceRef.current.setView([location.lat, location.lng], 18);
      }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor} ${isAlarmActive ? 'animate-pulse bg-red-900/20' : ''}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <Shield size={20} className={isAlarmActive ? "text-red-500 animate-ping" : "text-red-500"} />
           <h1 className="font-bold text-lg">Antitheft</h1>
        </div>
        <div className="flex-1" />
        <button onClick={focusView} className="p-2 rounded-full hover:bg-gray-500/10">
            <Crosshair size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
          
          {/* Map Container */}
          <div className="w-full h-72 relative bg-gray-900">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_-20px_40px_rgba(0,0,0,0.5)] z-10" />
              
              {/* Overlay Info */}
              <div className="absolute top-4 left-4 z-20 space-y-2">
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-bold text-white uppercase">
                          {isTracking ? 'GPS LOCKED' : (isManualMode ? 'MANUAL PIN MODE' : 'SYSTEM OFFLINE')}
                      </span>
                  </div>
                  
                  {isTracking && (
                      <div className={`backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center space-x-2 ${distance > 10 ? 'bg-red-600/80 animate-pulse' : 'bg-black/60'}`}>
                          <AlertTriangle size={12} className={distance > 10 ? "text-white" : "text-orange-500"} />
                          <span className="text-[10px] font-bold text-white uppercase">DIST: {distance}M / 10M</span>
                      </div>
                  )}
              </div>

              {/* Manual Mode Overlay Hint */}
              {isManualMode && !isTracking && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center space-x-1">
                          <MousePointer2 size={12} />
                          <span>TAP MAP TO SET PIN</span>
                      </div>
                  </div>
              )}
          </div>

          <div className="p-6 space-y-6">
              
              {/* Alarm Banner */}
              {isAlarmActive && (
                  <div className="p-4 bg-red-600 text-white rounded-2xl shadow-xl animate-bounce flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                          <Volume2 size={24} className="animate-ping" />
                          <div>
                              <p className="font-black uppercase text-lg">THEFT DETECTED!</p>
                              <p className="text-xs opacity-90">Device moved {distance}m from lock point.</p>
                          </div>
                      </div>
                      <button 
                        onClick={stopAlarm}
                        className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-xs"
                      >
                          STOP
                      </button>
                  </div>
              )}

              {/* Location Details Card */}
              <div className={`p-5 rounded-2xl border space-y-4 ${cardBg} ${isAlarmActive ? 'border-red-500' : ''}`}>
                  <div className="flex items-start space-x-3">
                      <div className={`p-3 rounded-xl ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                          <Navigation size={24} className={isTracking ? "text-green-500" : "text-blue-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1">
                              {isTracking || lockedPosition ? 'Locked Point (Pin)' : 'Current Position'}
                          </p>
                          <p className="text-sm font-bold truncate">
                              {lockedPosition 
                                  ? `${lockedPosition.lat.toFixed(6)}, ${lockedPosition.lng.toFixed(6)}`
                                  : (location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'N/A')
                              }
                          </p>
                          <div className="flex items-start space-x-1.5 mt-2 opacity-60">
                              <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                              <p className="text-xs leading-relaxed line-clamp-2">{address}</p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-500/10 flex justify-between items-center text-xs">
                       <span className="opacity-50">Last Update:</span>
                       <span className="font-mono font-bold">{lastUpdate}</span>
                  </div>
              </div>
              
              {/* CallMeBot Integration Card */}
              <div className={`p-4 rounded-xl border space-y-3 ${cardBg}`}>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-green-500">
                          <MessageCircle size={20} />
                          <span className="font-bold text-sm">WhatsApp Alert Configured</span>
                      </div>
                      <button 
                         onClick={handleTestSystem}
                         className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg flex items-center space-x-1 active:scale-95"
                      >
                         <Zap size={10} />
                         <span>TEST SYSTEM</span>
                      </button>
                  </div>
                  <div className={`p-3 rounded-lg text-xs font-mono opacity-80 space-y-1 ${theme === 'black' ? 'bg-black/50' : 'bg-gray-100'}`}>
                      <div className="flex justify-between">
                          <span className="opacity-50">Phone:</span>
                          <span className="font-bold">{CALLMEBOT_PHONE}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="opacity-50">API Key:</span>
                          <span className="font-bold">{CALLMEBOT_API_KEY}</span>
                      </div>
                  </div>
              </div>

              {/* Security Incidents / Clone List */}
              {incidents.length > 0 && (
                  <div className="space-y-3">
                      <h3 className="text-xs font-bold opacity-50 uppercase ml-1">Security Incidents</h3>
                      {incidents.map((inc, i) => (
                          <div key={i} className={`p-4 rounded-xl border border-red-500/30 ${theme === 'black' ? 'bg-red-900/10' : 'bg-red-50'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                  <div className="p-2 rounded-full bg-red-500 text-white">
                                      <FileWarning size={16} />
                                  </div>
                                  <div>
                                      <p className="font-bold text-sm text-red-500 uppercase">Clone Detected</p>
                                      <p className="text-[10px] opacity-60">{new Date(inc.timestamp).toLocaleString()}</p>
                                  </div>
                              </div>
                              
                              {inc.video && (
                                  <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-500/20 relative">
                                      <video src={inc.video} controls className="w-full h-full object-cover" />
                                      <div className="absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded text-[8px] font-bold text-white flex items-center space-x-1">
                                          <Video size={8} />
                                          <span>EVIDENCE</span>
                                      </div>
                                  </div>
                              )}
                              
                              {inc.location && (
                                  <div className="mt-3 flex items-center space-x-1 text-[10px] opacity-60">
                                      <MapPin size={10} />
                                      <span>{inc.location.lat.toFixed(5)}, {inc.location.lng.toFixed(5)}</span>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}

              {/* Controls */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">Configuration</h3>
                      {!isTracking && (
                          <button 
                            onClick={() => setIsManualMode(!isManualMode)}
                            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center space-x-1 transition-all ${
                                isManualMode 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : (theme === 'black' ? 'border-neutral-700 bg-neutral-800' : 'border-gray-200 bg-gray-100')
                            }`}
                          >
                              <MapIcon size={12} />
                              <span>{isManualMode ? 'Manual Pin Active' : 'Set Pin Manually'}</span>
                          </button>
                      )}
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between ${cardBg}`}>
                      <div>
                          <p className="font-bold">Enable Antitheft</p>
                          <p className="text-xs opacity-50 mt-1">{isTracking ? 'System Armed & Locked' : 'System Disarmed'}</p>
                      </div>
                      <button 
                        onClick={toggleTracking}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isTracking ? 'bg-green-600' : 'bg-gray-600'}`}
                      >
                          <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center ${isTracking ? 'translate-x-6' : ''}`}>
                             {isTracking ? <Lock size={12} className="text-green-600" /> : <Unlock size={12} className="text-gray-600" />}
                          </div>
                      </button>
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs font-bold opacity-50 uppercase ml-1">Sync Frequency</label>
                      <div className={`relative rounded-xl border overflow-hidden ${cardBg}`}>
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">
                              <Clock size={18} />
                          </div>
                          <select 
                            value={intervalMinutes}
                            onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                            disabled={isTracking}
                            className={`w-full pl-12 pr-4 py-4 bg-transparent outline-none appearance-none font-bold ${isTracking ? 'opacity-50' : ''} ${inputBg}`}
                          >
                              {INTERVAL_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                              <Globe size={16} />
                          </div>
                      </div>
                      {isTracking && <p className="text-[10px] text-green-500 ml-1">* Stop tracking to change interval</p>}
                  </div>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start space-x-3">
                      <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                          <p className="text-sm font-bold text-blue-500 mb-1">Safety Lock Active</p>
                          <p className="text-xs opacity-70 leading-relaxed">
                              When enabled, position is locked. If device moves {'>'} 10m, alarm sounds.
                              <br/>
                              <span className="font-bold">Manual Mode:</span> Tap map or drag pin to set specific lock coordinate before arming.
                          </p>
                      </div>
                  </div>
              </div>

          </div>
      </main>
    </div>
  );
};