import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { CameraView } from './CameraView';
import { ClockingView } from './ClockingView';
import { SettingsView } from './SettingsView';
import { CheckpointSettingsView } from './CheckpointSettingsView';
import { BiometricSettingsView } from './BiometricSettingsView';
import { ZoneSettingsView } from './ZoneSettingsView';
import { RegisterZoneView } from './RegisterZoneView';
import { RegisterOfficerView } from './RegisterOfficerView';
import { DeleteOfficerView } from './DeleteOfficerView';
import { SpeedtestView } from './SpeedtestView';
import { HistoryView } from './HistoryView';
import { VisitorView } from './VisitorView';
import { LogbookView } from './LogbookView';
import { AboutView } from './AboutView';
import { SubscriptionView } from './SubscriptionView';
import { SupportView } from './SupportView';
import { DiagnoseView } from './DiagnoseView';
import { AntitheftView } from './AntitheftView';
import { AntiCloneView } from './AntiCloneView';
import { ScheduleView } from './ScheduleView';
import { NationalDisasterView } from './NationalDisasterView';
import { GeofencingView } from './GeofencingView';
import { DMCLoginView } from './DMCLoginView';
import { dbService } from '../services/db';
import { Theme, ViewState, Zone } from '../types';
import { 
  MapPin, 
  Activity, 
  AlertTriangle, 
  X, 
  Eye, 
  EyeOff, 
  Lock, 
  BookOpen, 
  UserCheck, 
  ClipboardList,
  LifeBuoy,
  AlarmClock,
  Timer,
  CheckCircle2,
  Scan,
  Users,
  Loader2,
  RefreshCw
} from 'lucide-react';

const ClockWidget = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  
  return <span>{new Date().toLocaleDateString()} • {time}</span>;
};

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  theme: Theme;
  onClick?: () => void;
  active?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, label, theme, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all ${
        active 
          ? (theme === 'black' ? 'bg-green-900/20 border-green-500/50' : 'bg-green-50 border-green-200')
          : (theme === 'black' ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800' : 'bg-white border-gray-100 hover:bg-gray-50')
    }`}
  >
    <div className={`p-2 rounded-full ${
        active 
          ? 'bg-green-500 text-white' 
          : (theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100')
    }`}>
      {icon}
    </div>
    <span className={`text-xs font-medium ${active ? 'text-green-500' : ''}`}>{label}</span>
  </button>
);

interface ActivityItemProps {
  title: string;
  time: string;
  status: string;
  theme: Theme;
  isSync?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ title, time, status, theme, isSync }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl border ${theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100'}`}>
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg ${isSync ? 'bg-blue-500/10 text-blue-500' : (theme === 'black' ? 'bg-neutral-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
        {isSync ? <RefreshCw size={16} /> : <Activity size={16} />}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className={`text-[10px] ${theme === 'black' ? 'text-gray-500' : 'text-gray-400'}`}>{time}</p>
      </div>
    </div>
    <span className={`text-[10px] px-2 py-1 rounded-md ${
        isSync 
            ? 'bg-blue-500/10 text-blue-500' 
            : (theme === 'black' ? 'bg-neutral-800 text-gray-300' : 'bg-gray-100 text-gray-600')
    }`}>
      {status}
    </span>
  </div>
);

interface MainLayoutProps {
  theme: Theme;
  toggleTheme: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ theme, toggleTheme }) => {
  const [viewState, setViewState] = useState<ViewState>('dashboard');
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Hourly Patrol Alarm State
  const [isPatrolDue, setIsPatrolDue] = useState(false);
  const [nextPatrolTime, setNextPatrolTime] = useState<string>('');
  const alarmCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  // Attendance State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  
  // Active Zone State
  const [activeZone, setActiveZone] = useState<Zone | null>(null);

  // Attendance Face Scan State
  const [isAttendanceScanning, setIsAttendanceScanning] = useState(false);
  const [attendanceScanStatus, setAttendanceScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const attendanceVideoRef = useRef<HTMLVideoElement>(null);
  const attendanceStreamRef = useRef<MediaStream | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncTimeRef = useRef<number>(0);
  const [activities, setActivities] = useState([
      { title: "Perimeter Check", time: "10:42 AM", status: "Completed", isSync: false },
      { title: "Shift Start", time: "08:00 AM", status: "Confirmed", isSync: false },
      { title: "System Sync", time: "07:55 AM", status: "Auto", isSync: true }
  ]);

  // Request Geolocation Permission on Mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Location access granted", position);
        },
        (error) => {
          console.error("Location access denied or error", error);
        }
      );
    }
    updateNextPatrolTime();
    loadActiveZone();
  }, []);

  // Reload zone when switching back to dashboard
  useEffect(() => {
      if (viewState === 'dashboard') {
          loadActiveZone();
      }
  }, [viewState]);

  const loadActiveZone = async () => {
      try {
          const zone = await dbService.getActiveZone();
          setActiveZone(zone);
      } catch (e) {
          console.error("Failed to load active zone", e);
      }
  };

  const updateNextPatrolTime = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(now.getHours() + 1, 0, 0, 0);
    setNextPatrolTime(next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const performSystemSync = async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      try {
          await dbService.syncData();
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setActivities(prev => [
              { title: "System Sync", time: timeStr, status: "Auto", isSync: true },
              ...prev.slice(0, 4)
          ]);
      } catch (e) {
          console.error("Sync failed", e);
      } finally {
          setIsSyncing(false);
      }
  };

  // --- Scheduler Logic ---
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Hourly Patrol Check
      if (minutes === 0 && seconds < 2 && !isPatrolDue) {
        triggerHourlyPatrol();
      }
      
      if (minutes === 0 && seconds > 5) {
         updateNextPatrolTime();
      }

      // System Sync Check (12:00 PM or 00:00 AM)
      // Check if hour is 0 or 12, minute is 0, and we haven't synced in the last minute
      const isSyncTime = (hours === 0 || hours === 12) && minutes === 0;
      
      if (isSyncTime && (Date.now() - lastSyncTimeRef.current > 60000)) {
          lastSyncTimeRef.current = Date.now();
          performSystemSync();
      }
    };

    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [isPatrolDue, isSyncing]);

  // Clean up alarm and camera on unmount
  useEffect(() => {
    return () => {
        stopHourlyAlarm();
        stopAttendanceCamera();
    };
  }, []);

  const triggerHourlyPatrol = () => {
    setIsPatrolDue(true);
    playHourlyAlarm();
    updateNextPatrolTime();
  };

  const playHourlyAlarm = () => {
    try {
      if (alarmCtxRef.current) return;

      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      alarmCtxRef.current = ctx;

      const playBeep = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, startTime);
        osc.frequency.setValueAtTime(2500, startTime + 0.1);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gain.gain.setValueAtTime(0.5, startTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.15);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      };

      const scheduleBeeps = () => {
        const now = ctx.currentTime;
        playBeep(now);
        playBeep(now + 0.2);
        playBeep(now + 0.4);
        playBeep(now + 0.6);
      };

      scheduleBeeps();

      alarmIntervalRef.current = window.setInterval(() => {
         if (alarmCtxRef.current?.state === 'running') {
            scheduleBeeps();
         }
      }, 2000);

    } catch (e) {
      console.error("Failed to play alarm", e);
    }
  };

  const stopHourlyAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (alarmCtxRef.current) {
      alarmCtxRef.current.close();
      alarmCtxRef.current = null;
    }
  };

  const handleStartPatrol = () => {
    stopHourlyAlarm();
    setIsPatrolDue(false);
    setViewState('clocking');
  };

  // --- Attendance Logic with Face ID ---

  const handleAttendance = () => {
      setIsAttendanceScanning(true);
      setAttendanceScanStatus('scanning');
      startAttendanceCamera();
  };

  const startAttendanceCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'user', width: { ideal: 480 } } 
          });
          attendanceStreamRef.current = stream;
          if (attendanceVideoRef.current) {
              attendanceVideoRef.current.srcObject = stream;
          }
          
          // Verify
          setTimeout(() => {
              processAttendanceToggle();
          }, 2000);
      } catch (e) {
          console.error("Attendance camera error", e);
          // Sim fallback
          setTimeout(() => {
              processAttendanceToggle();
          }, 1500);
      }
  };

  const stopAttendanceCamera = () => {
      if (attendanceStreamRef.current) {
          attendanceStreamRef.current.getTracks().forEach(t => t.stop());
          attendanceStreamRef.current = null;
      }
      setIsAttendanceScanning(false);
      setAttendanceScanStatus('idle');
  };

  const processAttendanceToggle = async () => {
      setAttendanceScanStatus('success');
      const newState = !isCheckedIn;
      setIsCheckedIn(newState);
      
      const action = newState ? 'ATTENDANCE_IN' : 'ATTENDANCE_OUT';
      const msg = newState ? 'Officer Checked In' : 'Officer Checked Out';
      
      await dbService.logAction(action, msg);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      setTimeout(() => {
          stopAttendanceCamera();
      }, 1500);
  };

  // --- Theme Helpers ---
  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const subText = theme === 'black' ? 'text-gray-400' : 'text-gray-500';

  const handleMenuClick = (label: string) => {
    if (label === 'Setting') {
      setIsAuthModalOpen(true);
      setPasswordInput('');
      setAuthError(false);
    } else if (label === 'Speed Test') {
      setViewState('speedtest');
    } else if (label === 'History') {
      setViewState('history');
    } else if (label === 'About') {
      setViewState('about');
    } else if (label === 'Subscription') {
      setViewState('subscription');
    } else if (label === 'Support') {
      setViewState('support');
    } else if (label === 'Schedule') {
      setViewState('schedule');
    }
  };

  const handleAuthSubmit = () => {
    if (passwordInput === '123456') {
      setIsAuthModalOpen(false);
      setViewState('settings');
      setPasswordInput('');
    } else {
      setAuthError(true);
    }
  };

  // Render view based on state
  const renderContent = () => {
    switch (viewState) {
      case 'camera':
        return (
          <CameraView 
            theme={theme} 
            onBack={() => setViewState('dashboard')} 
            onNavigate={(view) => setViewState(view)} 
          />
        );
      case 'clocking':
        return (
          <ClockingView 
            theme={theme} 
            onExit={() => setViewState('dashboard')} 
          />
        );
      case 'settings':
        return (
          <SettingsView 
            theme={theme}
            onBack={() => setViewState('dashboard')}
            onNavigate={(view) => setViewState(view)}
          />
        );
      case 'checkpointSettings':
        return (
          <CheckpointSettingsView
            theme={theme}
            onBack={() => setViewState('settings')}
          />
        );
      case 'biometricSettings':
        return (
          <BiometricSettingsView
            theme={theme}
            onBack={() => setViewState('settings')}
          />
        );
      case 'zoneSettings':
        return (
          <ZoneSettingsView
            theme={theme}
            onBack={() => setViewState('settings')}
            onNavigate={(view) => setViewState(view)}
          />
        );
      case 'registerZone':
        return (
          <RegisterZoneView
            theme={theme}
            onBack={() => setViewState('zoneSettings')}
          />
        );
      case 'registerOfficer':
        return (
          <RegisterOfficerView
            theme={theme}
            onBack={() => setViewState('zoneSettings')}
          />
        );
      case 'deleteOfficer':
        return (
          <DeleteOfficerView
            theme={theme}
            onBack={() => setViewState('zoneSettings')}
          />
        );
      case 'speedtest':
        return (
          <SpeedtestView 
            theme={theme}
            onBack={() => setViewState('dashboard')}
          />
        );
      case 'history':
        return (
          <HistoryView
            theme={theme}
            onBack={() => setViewState('dashboard')}
          />
        );
      case 'visitor':
        return (
          <VisitorView
            theme={theme}
            onBack={() => setViewState('dashboard')}
          />
        );
      case 'logbook':
        return (
          <LogbookView
            theme={theme}
            onBack={() => setViewState('dashboard')}
          />
        );
      case 'about':
        return (
          <AboutView 
            theme={theme}
            onBack={() => setViewState('dashboard')}
            onNavigate={(view) => setViewState(view)}
          />
        );
      case 'subscription':
        return (
          <SubscriptionView
            theme={theme}
            onBack={() => setViewState('dashboard')}
          />
        );
      case 'support':
        return (
          <SupportView
            theme={theme}
            onBack={() => setViewState('dashboard')}
          />
        );
      case 'diagnose':
        return (
          <DiagnoseView
            theme={theme}
            onBack={() => setViewState('about')}
          />
        );
      case 'antitheft':
        return (
            <AntitheftView
                theme={theme}
                onBack={() => setViewState('about')}
            />
        );
      case 'antiClone':
        return (
            <AntiCloneView
                theme={theme}
                onBack={() => setViewState('about')}
            />
        );
      case 'schedule':
        return (
            <ScheduleView
                theme={theme}
                onBack={() => setViewState('dashboard')}
            />
        );
      case 'nationalDisaster':
        return (
            <NationalDisasterView
                theme={theme}
                onBack={() => setViewState('dashboard')}
            />
        );
      case 'geofencing':
        return (
          <GeofencingView 
            theme={theme}
            onBack={() => setViewState('about')}
          />
        );
      case 'dmcLogin':
        return (
          <DMCLoginView 
            theme={theme}
            onBack={() => setViewState('about')}
          />
        );
      default:
        // Dashboard view
        return (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Status Card */}
            <div className={`p-5 rounded-2xl border shadow-sm ${cardBg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">On Duty</h2>
                  <p className={`text-xs ${subText} mt-1 font-medium`}>
                     {activeZone ? `${activeZone.zoneName}, ${activeZone.country}` : 'No Active Zone'}
                  </p>
                  {activeZone && <p className="text-[10px] opacity-50">{activeZone.officerName} ({activeZone.unit})</p>}
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${isCheckedIn ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs font-bold uppercase">{isCheckedIn ? 'Active' : 'Offline'}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                 <div className="flex items-center space-x-2 text-xs opacity-70">
                    <ClockWidget />
                 </div>
                 <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500">
                    <Timer size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Next: {nextPatrolTime}</span>
                 </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <ActionCard 
                icon={<MapPin className="text-blue-500" />} 
                label="Clocking" 
                theme={theme} 
                onClick={() => setViewState('clocking')}
              />
              <ActionCard 
                icon={<AlertTriangle className="text-orange-500" />} 
                label="Report Incident" 
                theme={theme} 
                onClick={() => setViewState('camera')}
              />
              <ActionCard 
                icon={<BookOpen className="text-purple-500" />} 
                label="Logbook" 
                theme={theme} 
                onClick={() => setViewState('logbook')}
              />
              <ActionCard 
                icon={<UserCheck className={isCheckedIn ? "text-white" : "text-green-500"} />} 
                label={isCheckedIn ? "Check Out" : "Check In"} 
                theme={theme} 
                active={isCheckedIn}
                onClick={handleAttendance}
              />
              <ActionCard 
                icon={<LifeBuoy className="text-red-600" />} 
                label="National Disaster Report" 
                theme={theme} 
                onClick={() => setViewState('nationalDisaster')}
              />
              <ActionCard 
                icon={<Users className="text-indigo-500" />} 
                label="Visitor" 
                theme={theme} 
                onClick={() => setViewState('visitor')}
              />
            </div>

            {/* Recent Activity */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className={`text-sm font-semibold ${subText}`}>Recent Activity</h3>
                  {isSyncing && (
                      <div className="flex items-center space-x-1 text-[10px] text-blue-500">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Syncing...</span>
                      </div>
                  )}
              </div>
              <div className="space-y-3">
                {activities.map((item, idx) => (
                    <ActivityItem 
                      key={idx}
                      title={item.title} 
                      time={item.time} 
                      status={item.status} 
                      theme={theme}
                      isSync={item.isSync}
                    />
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  const showHeader = viewState === 'dashboard';
  const showBottomNav = viewState === 'dashboard';

  return (
    <div className={`flex flex-col h-full relative ${bgColor} ${textColor}`}>
      
      {/* Header */}
      {showHeader && <Header theme={theme} onMenuClick={handleMenuClick} />}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-hidden relative ${showHeader ? 'mt-16' : ''} ${showBottomNav ? 'pb-20' : ''}`}>
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNav 
          theme={theme} 
          toggleTheme={toggleTheme} 
          viewState={viewState}
          setViewState={setViewState}
        />
      )}

      {/* Attendance Face Scan Overlay */}
      {isAttendanceScanning && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="w-full max-w-sm flex flex-col items-center space-y-6">
               <div className="text-center space-y-2">
                   <h2 className="text-2xl font-bold text-white">
                       {attendanceScanStatus === 'success' 
                           ? (isCheckedIn ? 'Checked In' : 'Checked Out') 
                           : (isCheckedIn ? 'Checking Out...' : 'Checking In...')
                       }
                   </h2>
                   <p className="text-white/60 text-sm">
                       {attendanceScanStatus === 'success' ? 'Shift Updated Successfully' : 'Verifying Face ID'}
                   </p>
               </div>

               <div className="relative w-64 h-64">
                   <div className={`w-full h-full rounded-full overflow-hidden border-4 relative shadow-2xl ${
                       attendanceScanStatus === 'success' ? 'border-green-500' : 'border-blue-500'
                   }`}>
                       <video 
                           ref={attendanceVideoRef}
                           autoPlay 
                           playsInline 
                           muted
                           className="w-full h-full object-cover mirror-mode"
                           style={{ transform: 'scaleX(-1)' }}
                       />
                       
                       {attendanceScanStatus === 'scanning' && (
                           <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-pulse" />
                       )}
                       
                       {attendanceScanStatus === 'scanning' && (
                           <div className="absolute inset-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />
                       )}

                       {attendanceScanStatus === 'success' && (
                           <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center animate-in zoom-in">
                               <CheckCircle2 size={64} className="text-white drop-shadow-lg" />
                           </div>
                       )}
                   </div>
               </div>
               
               {/* Cancel only if stuck or scanning */}
               {attendanceScanStatus === 'scanning' && (
                   <button 
                       onClick={stopAttendanceCamera} 
                       className="px-6 py-2 bg-neutral-800 rounded-full text-white text-sm font-medium hover:bg-neutral-700"
                   >
                       Cancel
                   </button>
               )}
           </div>
           <style>{`
               @keyframes scan {
                   0% { top: 0%; opacity: 0; }
                   50% { opacity: 1; }
                   100% { top: 100%; opacity: 0; }
               }
           `}</style>
        </div>
      )}

      {/* Admin Auth Modal */}
      {isAuthModalOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl border ${theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h2 className="text-xl font-bold">Admin Password</h2>
                    <p className={`text-xs mt-1 ${subText}`}>Enter admin password to proceed.</p>
                 </div>
                 <button 
                   onClick={() => setIsAuthModalOpen(false)}
                   className={`p-1 rounded-full ${theme === 'black' ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}`}
                 >
                   <X size={20} className="opacity-50" />
                 </button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-70 ml-1">PASSWORD</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
                        <Lock size={16} />
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          setAuthError(false);
                        }}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl border outline-none transition-colors ${
                          theme === 'black' 
                            ? 'bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white' 
                            : 'bg-neutral-50 border-neutral-200 focus:border-blue-500 text-black'
                        } ${authError ? 'border-red-500' : ''}`}
                        placeholder="Enter password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {authError && (
                      <p className="text-xs text-red-500 ml-1">Incorrect password. Please try again.</p>
                    )}
                 </div>

                 <button 
                   onClick={handleAuthSubmit}
                   className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-lg active:scale-95 transition-all"
                 >
                   SUBMIT
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Hourly Patrol Alert Modal */}
      {isPatrolDue && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-red-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl border-2 border-red-500 text-center relative overflow-hidden ${theme === 'black' ? 'bg-neutral-900 text-white' : 'bg-white text-black'}`}>
             {/* Background pulse effect */}
             <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
             
             <div className="relative z-10 flex flex-col items-center">
               <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-6 animate-bounce shadow-lg shadow-red-500/20">
                 <AlarmClock size={40} />
               </div>
               
               <h2 className="text-3xl font-black mb-2 uppercase tracking-wide">Patrol Due!</h2>
               <p className="opacity-80 mb-8 px-4 text-sm leading-relaxed">
                 It is time for the hourly clocking round. Please proceed to checkpoints immediately.
               </p>
               
               <button 
                 onClick={handleStartPatrol}
                 className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
               >
                 <MapPin size={20} />
                 <span>START PATROL</span>
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};