import React, { useEffect, useState } from 'react';
import { Theme, Visitor } from '../types';
import { ArrowLeft, Info, Calendar as CalendarIcon, ChevronDown, User, Clock, ArrowRight, FileText, CheckCircle2, AlertCircle, X, CreditCard, Car, Video, Camera, AlertTriangle, MapPin, BookOpen } from 'lucide-react';
import { dbService } from '../services/db';

interface HistoryViewProps {
  theme: Theme;
  onBack: () => void;
}

type Tab = 'CLOCKING' | 'ATTENDANCE' | 'VISITOR' | 'INCIDENT' | 'LOGBOOK';

interface PatrolSession {
  id: string;
  dateStr: string;      // "Wed, 18 Feb 2026"
  startTimeStr: string; // "03:00:49 PM"
  endTimeStr: string;   // "03:01:55 PM"
  sessionSlot: string;  // "03:00:00 PM --> 04:00:00 PM"
  status: 'COMPLETED' | 'INCOMPLETE';
  count: number;
  total: number;
  officerName: string;
}

interface AttendanceSession {
  id: string;
  officerName: string;
  dateHeader: string; // "18 FEB 2026"
  inTime: string; // "8:35 AM"
  outTime: string; // "8:05 AM (18 Feb 2026)"
  duration: string; // "13 : 23 : 10"
  sortTime: number;
}

interface AttendanceGroup {
    date: string;
    items: AttendanceSession[];
}

interface IncidentReport {
    id?: number;
    timestamp: string;
    description: string;
    image: string;
    location?: { lat: number; lng: number };
}

interface LogbookEntry {
  id?: number;
  timestamp: string;
  reason: string;
  media?: string;
  mediaType: 'image' | 'video';
}

export const HistoryView: React.FC<HistoryViewProps> = ({ theme, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('CLOCKING');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [sessions, setSessions] = useState<PatrolSession[]>([]);
  const [attendanceGroups, setAttendanceGroups] = useState<AttendanceGroup[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<Visitor[]>([]);
  const [incidentLogs, setIncidentLogs] = useState<IncidentReport[]>([]);
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  
  // Selection States
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [selectedLogbook, setSelectedLogbook] = useState<LogbookEntry | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [officerName, setOfficerName] = useState("Officer 88201"); // Default

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get User Name
      const user = await dbService.verifyUser('88201', '123456'); // Quick fetch or use session context
      const currentOfficerName = user ? user.name.toUpperCase() : "MOHD FAIZAL BIN ZOLKEFLI";
      setOfficerName(currentOfficerName);

      // 2. Fetch all logs
      const allLogs = await dbService.getLogs();

      // --- PROCESS CLOCKING SESSIONS ---
      const clockingLogs = allLogs.filter(l => l.action.startsWith('CLOCKING'));
      const groups: Record<string, typeof clockingLogs> = {};

      clockingLogs.forEach(log => {
        const date = new Date(log.timestamp);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
      });

      const processedSessions: PatrolSession[] = Object.keys(groups).map(key => {
         const group = groups[key];
         group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
         
         const firstLog = group[0];
         const lastLog = group[group.length - 1];
         const start = new Date(firstLog.timestamp);
         const end = new Date(lastLog.timestamp);

         const slotStart = new Date(start);
         slotStart.setMinutes(0, 0, 0);
         const slotEnd = new Date(slotStart);
         slotEnd.setHours(slotEnd.getHours() + 1);

         const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
         const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

         const checkedCount = group.filter(l => l.details.includes('Checked')).length;
         const isCompleted = group.some(l => l.details.includes('Completed'));

         return {
             id: key,
             dateStr: formatDate(start),
             startTimeStr: formatTime(start),
             endTimeStr: formatTime(end),
             sessionSlot: `${formatTime(slotStart)} --> ${formatTime(slotEnd)}`,
             status: isCompleted ? 'COMPLETED' : 'INCOMPLETE',
             count: checkedCount,
             total: 4, // Assuming 4 default checkpoints
             officerName: currentOfficerName
         };
      });

      setSessions(processedSessions.reverse());


      // --- PROCESS ATTENDANCE ---
      const attLogs = allLogs.filter(l => l.action.startsWith('ATTENDANCE'));
      const attSessions: AttendanceSession[] = [];
      
      for (let i = 0; i < attLogs.length; i++) {
          const log = attLogs[i];
          if (log.action === 'ATTENDANCE_IN') {
              const inTime = new Date(log.timestamp);
              let outTime = null;
              // Find next OUT
              for (let j = i + 1; j < attLogs.length; j++) {
                  if (attLogs[j].action === 'ATTENDANCE_OUT') {
                      outTime = new Date(attLogs[j].timestamp);
                      i = j; // Skip
                      break;
                  }
              }
              
              const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const formatDateHeader = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
              
              let duration = "-";
              if (outTime) {
                  const diff = outTime.getTime() - inTime.getTime();
                  const hours = Math.floor(diff / 3600000);
                  const mins = Math.floor((diff % 3600000) / 60000);
                  const secs = Math.floor((diff % 60000) / 1000);
                  duration = `${hours.toString().padStart(2, '0')} : ${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
              }

              attSessions.push({
                  id: log.timestamp,
                  officerName: currentOfficerName,
                  dateHeader: formatDateHeader(inTime),
                  inTime: formatTime(inTime),
                  outTime: outTime ? formatTime(outTime) + ` (${outTime.getDate()} ${outTime.toLocaleString('default', { month: 'short' })})` : 'Active',
                  duration,
                  sortTime: inTime.getTime()
              });
          }
      }

      const attGroupsObj: Record<string, AttendanceSession[]> = {};
      attSessions.forEach(s => {
          if (!attGroupsObj[s.dateHeader]) attGroupsObj[s.dateHeader] = [];
          attGroupsObj[s.dateHeader].push(s);
      });
      
      const attGroupArray = Object.keys(attGroupsObj).map(date => ({
          date,
          items: attGroupsObj[date].sort((a, b) => b.sortTime - a.sortTime)
      }));
      setAttendanceGroups(attGroupArray);

      // --- VISITOR LOGS ---
      const visitors = await dbService.getVisitorHistory();
      setVisitorLogs(visitors.reverse());

      // --- INCIDENT LOGS ---
      const incidents = await dbService.getIncidents();
      setIncidentLogs(incidents.reverse());

      // --- LOGBOOK ENTRIES ---
      const logbooks = await dbService.getLogbookEntries();
      setLogbookEntries(logbooks.reverse());

      setLoading(false);
    } catch (e) {
      console.error("Error loading history", e);
      setLoading(false);
    }
  };

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const tabActiveBg = theme === 'black' ? 'bg-neutral-800 text-white' : 'bg-white text-blue-600 shadow-sm';
  const tabInactiveBg = theme === 'black' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700';

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center justify-between border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <div className="flex items-center space-x-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
                <ArrowLeft size={24} />
            </button>
            <h1 className="font-bold text-lg">History</h1>
        </div>
        
        {/* Date Filter (Mock) */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${theme === 'black' ? 'border-neutral-700 bg-neutral-800' : 'border-gray-200 bg-gray-50'}`}>
            <CalendarIcon size={14} className="opacity-60" />
            <span className="text-xs font-medium">18 Feb 2026</span>
            <ChevronDown size={14} className="opacity-60" />
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-0">
          <div className={`flex p-1 rounded-xl overflow-x-auto no-scrollbar ${theme === 'black' ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-100 border border-gray-200'}`}>
              <button 
                  onClick={() => setActiveTab('CLOCKING')}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'CLOCKING' ? tabActiveBg : tabInactiveBg}`}
              >
                  CLOCKING
              </button>
              <button 
                  onClick={() => setActiveTab('ATTENDANCE')}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'ATTENDANCE' ? tabActiveBg : tabInactiveBg}`}
              >
                  ATTENDANCE
              </button>
              <button 
                  onClick={() => setActiveTab('VISITOR')}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'VISITOR' ? tabActiveBg : tabInactiveBg}`}
              >
                  VISITOR
              </button>
              <button 
                  onClick={() => setActiveTab('INCIDENT')}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'INCIDENT' ? tabActiveBg : tabInactiveBg}`}
              >
                  INCIDENT
              </button>
              <button 
                  onClick={() => setActiveTab('LOGBOOK')}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'LOGBOOK' ? tabActiveBg : tabInactiveBg}`}
              >
                  LOGBOOK
              </button>
          </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* --- CLOCKING LIST --- */}
          {activeTab === 'CLOCKING' && (
              <div className="space-y-4">
                  {sessions.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                          <p>No clocking history found.</p>
                      </div>
                  ) : (
                      sessions.map((session, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border ${cardBg}`}>
                             {/* Session Header */}
                             <div className="flex justify-between items-start mb-3 border-b border-gray-500/10 pb-3">
                                 <div>
                                     <div className="flex items-center space-x-2 text-[10px] font-bold opacity-60 uppercase">
                                        <CalendarIcon size={12} />
                                        <span>{session.dateStr}</span>
                                     </div>
                                     <div className="flex items-center space-x-2 mt-1">
                                        <h3 className="text-sm font-bold">{session.sessionSlot}</h3>
                                     </div>
                                 </div>
                                 <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                     session.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                 }`}>
                                     {session.status}
                                 </div>
                             </div>

                             {/* Officer Info */}
                             <div className="flex items-center space-x-3 mb-4">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                                     <User size={16} className="opacity-60" />
                                 </div>
                                 <div className="flex-1">
                                     <p className="text-xs font-bold opacity-50">Patrol Officer</p>
                                     <p className="text-xs font-bold truncate">{session.officerName}</p>
                                 </div>
                             </div>

                             {/* Stats */}
                             <div className={`p-3 rounded-lg flex items-center justify-between ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                                 <div>
                                     <p className="text-[10px] opacity-60">Start Time</p>
                                     <p className="text-xs font-mono font-bold">{session.startTimeStr}</p>
                                 </div>
                                 <ArrowRight size={14} className="opacity-30" />
                                 <div className="text-right">
                                     <p className="text-[10px] opacity-60">End Time</p>
                                     <p className="text-xs font-mono font-bold">{session.endTimeStr}</p>
                                 </div>
                             </div>

                             <div className="mt-3 flex items-center justify-between text-xs">
                                 <span className="opacity-60">Checkpoints:</span>
                                 <span className="font-bold">{session.count} / {session.total}</span>
                             </div>
                          </div>
                      ))
                  )}
              </div>
          )}

          {/* --- ATTENDANCE LIST --- */}
          {activeTab === 'ATTENDANCE' && (
              <div className="space-y-6">
                  {attendanceGroups.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                          <p>No attendance records found.</p>
                      </div>
                  ) : (
                      attendanceGroups.map((group, idx) => (
                          <div key={idx} className="space-y-3">
                              <h3 className="text-[10px] font-bold opacity-50 px-2">{group.date}</h3>
                              {group.items.map((item, i) => (
                                  <div key={i} className={`p-4 rounded-xl border ${cardBg}`}>
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <p className="text-xs font-bold opacity-50 mb-1">OFFICER</p>
                                              <p className="text-sm font-bold">{item.officerName}</p>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-xs font-bold opacity-50 mb-1">DURATION</p>
                                              <p className="text-sm font-mono font-bold text-blue-500">{item.duration}</p>
                                          </div>
                                      </div>

                                      <div className="mt-4 grid grid-cols-2 gap-4">
                                          <div className={`p-2 rounded-lg ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                                              <div className="flex items-center space-x-1.5 mb-1 text-green-500">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                  <span className="text-[10px] font-bold uppercase">Clock In</span>
                                              </div>
                                              <p className="text-xs font-bold font-mono">{item.inTime}</p>
                                          </div>
                                          <div className={`p-2 rounded-lg ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-50'}`}>
                                              <div className="flex items-center space-x-1.5 mb-1 text-red-500">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                  <span className="text-[10px] font-bold uppercase">Clock Out</span>
                                              </div>
                                              <p className="text-xs font-bold font-mono">{item.outTime}</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ))
                  )}
              </div>
          )}

          {/* --- VISITOR LOG LIST --- */}
          {activeTab === 'VISITOR' && (
              <div className="space-y-4">
                  {visitorLogs.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                          <p>No visitor records found.</p>
                      </div>
                  ) : (
                      visitorLogs.map((log) => (
                          <div 
                              key={log.id} 
                              onClick={() => setSelectedVisitor(log)}
                              className={`p-4 rounded-xl border flex flex-col space-y-3 cursor-pointer hover:border-blue-500/50 transition-colors ${cardBg}`}
                          >
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${theme === 'black' ? 'bg-neutral-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                           {log.photos?.face ? (
                                                <img src={log.photos.face} alt="Face" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={20} />
                                            )}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-sm">{log.name}</h4>
                                          <div className="flex items-center space-x-2 text-xs opacity-60 mt-0.5">
                                              <span className="font-mono bg-white/10 px-1 rounded">{log.passId}</span>
                                              <span>•</span>
                                              <span>{log.purpose}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                      log.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                                  }`}>
                                      {log.status}
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-500/10">
                                  <div>
                                      <p className="text-[10px] opacity-50 uppercase font-bold mb-0.5">Time In</p>
                                      <div className="flex items-center space-x-1.5">
                                          <Clock size={12} className="text-green-500" />
                                          <span className="text-xs font-mono">{log.inTime}</span>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[10px] opacity-50 uppercase font-bold mb-0.5">Time Out</p>
                                      <div className="flex items-center justify-end space-x-1.5">
                                          {log.outTime && log.outTime !== '-' && <Clock size={12} className="text-red-500" />}
                                          <span className="text-xs font-mono">{log.outTime || '-'}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-[10px] opacity-40 text-center pt-1">
                                  Date: {log.date}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}

          {/* --- INCIDENT REPORT LIST --- */}
          {activeTab === 'INCIDENT' && (
              <div className="space-y-4">
                  {incidentLogs.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                          <p>No incidents reported.</p>
                      </div>
                  ) : (
                      incidentLogs.map((log) => (
                          <div 
                              key={log.id} 
                              onClick={() => setSelectedIncident(log)}
                              className={`p-4 rounded-xl border flex flex-col space-y-3 cursor-pointer hover:border-orange-500/50 transition-colors ${cardBg}`}
                          >
                              <div className="flex justify-between items-start space-x-4">
                                  <div className="w-16 h-16 rounded-lg bg-black flex-shrink-0 overflow-hidden border border-gray-500/20">
                                      {log.image ? (
                                          <img src={log.image} alt="Evidence" className="w-full h-full object-cover" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                                              <Camera size={20} className="opacity-50" />
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                           <h4 className="font-bold text-sm truncate pr-2 text-orange-500">Incident #{log.id}</h4>
                                           <span className="text-[10px] opacity-50 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      <p className="text-xs opacity-70 line-clamp-2 mt-1 leading-relaxed">
                                          {log.description}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center space-x-4 pt-2 border-t border-gray-500/10 text-[10px] opacity-50">
                                  <div className="flex items-center space-x-1">
                                      <CalendarIcon size={10} />
                                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                  </div>
                                  {log.location && (
                                      <div className="flex items-center space-x-1">
                                          <MapPin size={10} />
                                          <span>{log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}

          {/* --- LOGBOOK ENTRIES LIST --- */}
          {activeTab === 'LOGBOOK' && (
              <div className="space-y-4">
                  {logbookEntries.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                          <p>No logbook entries found.</p>
                      </div>
                  ) : (
                      logbookEntries.map((log) => (
                          <div 
                              key={log.id} 
                              onClick={() => setSelectedLogbook(log)}
                              className={`p-4 rounded-xl border flex flex-col space-y-3 cursor-pointer hover:border-purple-500/50 transition-colors ${cardBg}`}
                          >
                              <div className="flex justify-between items-start space-x-4">
                                  {log.media && (
                                      <div className="w-16 h-16 rounded-lg bg-black flex-shrink-0 overflow-hidden border border-gray-500/20 relative">
                                          {log.mediaType === 'image' ? (
                                              <img src={log.media} alt="Log Media" className="w-full h-full object-cover" />
                                          ) : (
                                              <video src={log.media} className="w-full h-full object-cover" />
                                          )}
                                          {log.mediaType === 'video' && (
                                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                  <Video size={16} className="text-white" />
                                              </div>
                                          )}
                                      </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                           <h4 className="font-bold text-sm truncate pr-2 text-purple-500">Logbook Entry #{log.id}</h4>
                                           <span className="text-[10px] opacity-50 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      <p className="text-xs opacity-70 line-clamp-2 mt-1 leading-relaxed">
                                          {log.reason}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center space-x-4 pt-2 border-t border-gray-500/10 text-[10px] opacity-50">
                                  <div className="flex items-center space-x-1">
                                      <CalendarIcon size={10} />
                                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                      <BookOpen size={10} />
                                      <span>Digital Log</span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}

      </main>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200 overflow-hidden">
             {/* Header */}
             <div className={`h-16 px-4 flex items-center justify-between border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
                 <div>
                    <h2 className={`font-bold text-lg ${textColor}`}>Visitor Details</h2>
                    <p className="text-[10px] opacity-60 font-mono">{selectedVisitor.passId}</p>
                 </div>
                 <button 
                    onClick={() => setSelectedVisitor(null)} 
                    className={`p-2 rounded-full ${theme === 'black' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                 >
                     <X size={20} className={textColor}/>
                 </button>
             </div>
             
             <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${bgColor} ${textColor}`}>
                 {/* Media Gallery */}
                 <div className="grid grid-cols-2 gap-3">
                     {/* Video */}
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
                             selectedVisitor.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
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
             </div>
          </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200 overflow-hidden">
           {/* Header */}
           <div className={`h-16 px-4 flex items-center justify-between border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
               <div>
                  <h2 className={`font-bold text-lg ${textColor}`}>Incident Details</h2>
                  <p className="text-[10px] opacity-60 font-mono text-orange-500">REPORT #{selectedIncident.id}</p>
               </div>
               <button 
                  onClick={() => setSelectedIncident(null)} 
                  className={`p-2 rounded-full ${theme === 'black' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-100 hover:bg-gray-200'}`}
               >
                   <X size={20} className={textColor}/>
               </button>
           </div>
           
           <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${bgColor} ${textColor}`}>
               <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-gray-500/20 relative group">
                   <img src={selectedIncident.image} alt="Incident" className="w-full h-full object-contain" />
                   <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white">EVIDENCE PHOTO</div>
               </div>

               <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                   <div>
                       <h3 className="text-xs font-bold opacity-50 uppercase mb-2">Description</h3>
                       <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedIncident.description}</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-500/10">
                       <div>
                           <p className="text-[10px] opacity-50 uppercase font-bold">Date</p>
                           <p className="font-mono text-sm">{new Date(selectedIncident.timestamp).toLocaleDateString()}</p>
                       </div>
                       <div>
                           <p className="text-[10px] opacity-50 uppercase font-bold">Time</p>
                           <p className="font-mono text-sm">{new Date(selectedIncident.timestamp).toLocaleTimeString()}</p>
                       </div>
                       {selectedIncident.location && (
                           <div className="col-span-2">
                               <p className="text-[10px] opacity-50 uppercase font-bold">GPS Coordinates</p>
                               <p className="font-mono text-sm flex items-center space-x-2">
                                   <MapPin size={14} className="text-blue-500" />
                                   <span>{selectedIncident.location.lat}, {selectedIncident.location.lng}</span>
                               </p>
                           </div>
                       )}
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Logbook Detail Modal */}
      {selectedLogbook && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200 overflow-hidden">
           {/* Header */}
           <div className={`h-16 px-4 flex items-center justify-between border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
               <div>
                  <h2 className={`font-bold text-lg ${textColor}`}>Logbook Entry</h2>
                  <p className="text-[10px] opacity-60 font-mono text-purple-500">LOG #{selectedLogbook.id}</p>
               </div>
               <button 
                  onClick={() => setSelectedLogbook(null)} 
                  className={`p-2 rounded-full ${theme === 'black' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-100 hover:bg-gray-200'}`}
               >
                   <X size={20} className={textColor}/>
               </button>
           </div>
           
           <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${bgColor} ${textColor}`}>
               {selectedLogbook.media && (
                   <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-gray-500/20 relative group">
                       {selectedLogbook.mediaType === 'image' ? (
                           <img src={selectedLogbook.media} alt="Log Media" className="w-full h-full object-cover" />
                       ) : (
                           <video src={selectedLogbook.media} controls className="w-full h-full object-contain" />
                       )}
                       <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-bold uppercase">
                           {selectedLogbook.mediaType} EVIDENCE
                       </div>
                   </div>
               )}

               <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                   <div>
                       <h3 className="text-xs font-bold opacity-50 uppercase mb-2">Reason / Details</h3>
                       <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedLogbook.reason}</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-500/10">
                       <div>
                           <p className="text-[10px] opacity-50 uppercase font-bold">Date</p>
                           <p className="font-mono text-sm">{new Date(selectedLogbook.timestamp).toLocaleDateString()}</p>
                       </div>
                       <div>
                           <p className="text-[10px] opacity-50 uppercase font-bold">Time</p>
                           <p className="font-mono text-sm">{new Date(selectedLogbook.timestamp).toLocaleTimeString()}</p>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};