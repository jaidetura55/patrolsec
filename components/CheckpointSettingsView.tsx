import React, { useState, useEffect, useRef } from 'react';
import { Theme, Checkpoint } from '../types';
import { ArrowLeft, MoreVertical, Nfc, ScanLine, X, Edit, Save, AlertCircle, CheckCircle2, Loader2, RotateCcw, ShieldCheck, Lock } from 'lucide-react';
import { dbService } from '../services/db';

interface CheckpointSettingsViewProps {
  theme: Theme;
  onBack: () => void;
}

export const CheckpointSettingsView: React.FC<CheckpointSettingsViewProps> = ({ theme, onBack }) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(null);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'write' | 'read' | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'read' | 'write', status: 'success' | 'error' } | null>(null);
  
  // Anti Clone State
  const [antiCloneEnabled, setAntiCloneEnabled] = useState(false);
  const [antiCloneKey, setAntiCloneKey] = useState('');

  // Toast State
  const [toast, setToast] = useState<{show: boolean, title: string, message: string, type: 'success' | 'error'} | null>(null);

  // Renaming state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // NFC Abort Controller to cancel scans
  const nfcAbortController = useRef<AbortController | null>(null);

  // Load from DB
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await dbService.getCheckpoints();
      setCheckpoints(data);
      
      // Load Protection Settings
      const acEnabled = await dbService.getSetting('anti_clone_challenge_a', false);
      const acKey = await dbService.getSetting('anti_clone_key_a', '');
      setAntiCloneEnabled(acEnabled);
      setAntiCloneKey(acKey);

      setLoading(false);
    } catch (e) {
      console.error("DB Error", e);
      setToast({ show: true, title: "Error", message: "Failed to load database.", type: 'error' });
      setLoading(false);
    }
  };

  // Persist changes to DB
  const updateCheckpoint = async (updatedCp: Checkpoint) => {
    // Optimistic UI update
    setCheckpoints(prev => prev.map(cp => cp.id === updatedCp.id ? updatedCp : cp));
    // DB Save
    await dbService.saveCheckpoint(updatedCp);
  };

  // Cleanup NFC on unmount
  useEffect(() => {
    return () => {
      if (nfcAbortController.current) {
        nfcAbortController.current.abort();
      }
    };
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast?.show) {
        const timer = setTimeout(() => {
            setToast(null);
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const subTextColor = theme === 'black' ? 'text-gray-400' : 'text-gray-500';
  const modalBg = theme === 'black' ? 'bg-neutral-800' : 'bg-white';
  const inputBg = theme === 'black' ? 'bg-neutral-900 border-neutral-700' : 'bg-gray-50 border-gray-300';

  const cleanupNfc = () => {
    if (nfcAbortController.current) {
        nfcAbortController.current.abort();
        nfcAbortController.current = null;
    }
  };

  const handleCloseModal = () => {
    cleanupNfc();
    setSelectedCheckpoint(null);
    setNfcStatus(null);
    setLoadingAction(null);
    setActionFeedback(null);
    setIsRenaming(false);
  };

  const handleOpenMenu = (id: number) => {
    setSelectedCheckpoint(id);
    setNfcStatus(null);
    setLoadingAction(null);
    setActionFeedback(null);
    setIsRenaming(false);
  };

  const startRenaming = () => {
    const cp = checkpoints.find(c => c.id === selectedCheckpoint);
    if (cp) {
      setRenameValue(cp.name);
      setIsRenaming(true);
    }
  };

  const saveRename = async () => {
    const cp = checkpoints.find(c => c.id === selectedCheckpoint);
    if (cp) {
        const updated = { ...cp, name: renameValue };
        await updateCheckpoint(updated);
        setIsRenaming(false);
        setSelectedCheckpoint(null);
        setToast({ show: true, title: "Saved", message: "Checkpoint renamed successfully.", type: 'success' });
    }
  };

  const handleResetDefaults = async () => {
      if (window.confirm("Reset all checkpoints to default settings? This will clear all NFC links and names.")) {
          setLoading(true);
          const defaults = await dbService.resetCheckpoints();
          setCheckpoints(defaults);
          setLoading(false);
          setToast({ show: true, title: "Reset Complete", message: "Checkpoints restored to defaults.", type: 'success' });
      }
  };

  const simulateNfcAction = async (action: 'write' | 'read') => {
      setTimeout(async () => {
          const cp = checkpoints.find(c => c.id === selectedCheckpoint);
          if (cp) {
            let message = `Checkpoint-${selectedCheckpoint}`;
            
            // Sync with Anti Clone Protection
            if (action === 'write' && antiCloneEnabled && antiCloneKey) {
                message = `${message}|${antiCloneKey}`;
            }

            const updated = { ...cp, nfcId: message };
            await updateCheckpoint(updated);

            if (action === 'write') {
                setNfcStatus("Simulated: Write Successful");
                setToast({ show: true, title: "Simulated Write", message: `Simulated tag programmed: ${message}`, type: 'success' });
            } else {
                setNfcStatus(`Simulated: Read Successful: ${message}`);
                setToast({ show: true, title: "Simulated Read", message: `Simulated tag linked: ${message}`, type: 'success' });
            }
          }
          setLoadingAction(null);
          setActionFeedback({ type: action, status: 'success' });
          setTimeout(() => setActionFeedback(null), 3000);
      }, 1500);
  };

  const handleNfcAction = async (action: 'write' | 'read') => {
    // Cancel previous scan if any
    cleanupNfc();
    setActionFeedback(null);
    setLoadingAction(action);
    setNfcStatus(action === 'write' ? "Ready to Write. Tap Tag..." : "Scanning for Tag...");
    
    // Check for simulation mode
    const isSimMode = await dbService.getSetting('nfc_simulation_mode', false);
    const isIframe = window.self !== window.top;
    
    if (isSimMode || isIframe || !('NDEFReader' in window)) {
        simulateNfcAction(action);
        return;
    }

    // Real NFC Logic
    try {
        const controller = new AbortController();
        nfcAbortController.current = controller;
        // @ts-ignore
        const ndef = new window.NDEFReader();
        await ndef.scan({ signal: controller.signal });

        ndef.onreading = async (event: any) => {
            try {
                const cp = checkpoints.find(c => c.id === selectedCheckpoint);
                if (!cp) return;

                if (action === 'write') {
                   // Write Logic
                   let message = `Checkpoint-${cp.id}`;
                   
                   // --- ANTI CLONE PROTECTION SYNC ---
                   // If Challenge A enabled, write the secure key to the tag
                   if (antiCloneEnabled && antiCloneKey) {
                       message = `${message}|${antiCloneKey}`;
                   }
                   
                   await ndef.write(message);
                   
                   const updated = { ...cp, nfcId: message };
                   await updateCheckpoint(updated);
                   
                   setNfcStatus("Write Successful!");
                   setToast({ show: true, title: "Write Success", message: "Tag successfully programmed.", type: 'success' });
                } else {
                   // Read Logic (Link existing tag)
                   const { serialNumber } = event;
                   // Use serial number or payload as ID
                   const id = serialNumber || "UNKNOWN_ID";
                   
                   const updated = { ...cp, nfcId: id };
                   await updateCheckpoint(updated);
                   
                   setNfcStatus(`Linked: ${id}`);
                   setToast({ show: true, title: "Link Success", message: `Checkpoint linked to tag: ${id}`, type: 'success' });
                }
                
                if (navigator.vibrate) navigator.vibrate(200);
                setActionFeedback({ type: action, status: 'success' });
                setLoadingAction(null);
                setTimeout(() => setActionFeedback(null), 3000);
                cleanupNfc();

            } catch (err: any) {
                console.error("NFC Operation Error", err);
                setNfcStatus("Error: " + err.message);
                setActionFeedback({ type: action, status: 'error' });
                setLoadingAction(null);
            }
        };

        ndef.onreadingerror = () => {
            setNfcStatus("Tag Read Error. Try again.");
        };

    } catch (err: any) {
        console.error("NFC Start Error", err);
        setNfcStatus("NFC Error: " + err.message);
        setLoadingAction(null);
        setActionFeedback({ type: action, status: 'error' });
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Toast Notification */}
      {toast?.show && (
          <div className={`absolute top-4 left-4 right-4 z-[70] p-4 rounded-xl shadow-2xl flex items-start space-x-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
              toast.type === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white'
          }`}>
              {toast.type === 'error' ? <AlertCircle size={20} className="mt-0.5" /> : <CheckCircle2 size={20} className="mt-0.5" />}
              <div className="flex-1">
                  <h4 className="font-bold text-sm">{toast.title}</h4>
                  <p className="text-xs opacity-90">{toast.message}</p>
              </div>
          </div>
      )}

      {/* Header */}
      <header className={`h-16 px-4 flex items-center justify-between border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <div className="flex items-center space-x-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
                <ArrowLeft size={24} />
            </button>
            <h1 className="font-bold text-lg">Checkpoints</h1>
        </div>
        <button 
          onClick={handleResetDefaults}
          className="p-2 rounded-full hover:bg-gray-500/10 text-gray-400"
          title="Reset to Defaults"
        >
            <RotateCcw size={20} />
        </button>
      </header>

      {/* List */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
         {/* Anti Clone Status Banner */}
         {antiCloneEnabled && (
             <div className="mb-4 p-3 rounded-xl border border-green-500/30 bg-green-500/10 flex items-center space-x-3">
                 <ShieldCheck size={20} className="text-green-500" />
                 <div>
                     <p className="text-sm font-bold text-green-500">Protection Active</p>
                     <p className="text-[10px] opacity-70">Writing tags includes Anti-Clone security keys.</p>
                 </div>
             </div>
         )}

         {loading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-3">
                 <Loader2 size={32} className="animate-spin" />
                 <p className="text-xs">Loading Database...</p>
             </div>
         ) : checkpoints.length === 0 ? (
             <div className="text-center py-20 opacity-50">
                 <p>No checkpoints found.</p>
             </div>
         ) : (
             checkpoints.map((cp) => (
                <div key={cp.id} className={`p-4 rounded-xl border flex items-center justify-between ${cardBg}`}>
                    <div>
                        <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1">{cp.position}</div>
                        <h3 className="font-bold text-lg leading-tight">{cp.name}</h3>
                        <div className="flex items-center space-x-1 mt-1">
                           <Nfc size={12} className={cp.nfcId ? "text-green-500" : "text-gray-400"} />
                           <span className={`text-xs ${cp.nfcId ? "text-green-500 font-medium" : "text-gray-400 italic"}`}>
                               {cp.nfcId ? "NFC Configured" : "No NFC Linked"}
                           </span>
                        </div>
                    </div>
                    <button 
                      onClick={() => handleOpenMenu(cp.id)}
                      className={`p-3 rounded-full ${theme === 'black' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <MoreVertical size={20} />
                    </button>
                </div>
             ))
         )}
      </main>

      {/* Edit Modal */}
      {selectedCheckpoint !== null && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div 
               className={`w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${modalBg} ${textColor} animate-in slide-in-from-bottom-10 duration-300`}
             >
                 {/* Modal Header */}
                 <div className="p-4 border-b border-gray-500/10 flex items-center justify-between">
                     <h3 className="font-bold text-lg">Edit Checkpoint</h3>
                     <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-gray-500/10">
                         <X size={24} />
                     </button>
                 </div>

                 <div className="p-6 space-y-6 overflow-y-auto">
                     {/* Renaming Section */}
                     <div className="space-y-2">
                        <label className="text-xs font-bold opacity-50 uppercase">Name</label>
                        {isRenaming ? (
                            <div className="flex items-center space-x-2">
                                <input 
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className={`flex-1 p-3 rounded-lg border outline-none ${inputBg}`}
                                  autoFocus
                                />
                                <button onClick={saveRename} className="p-3 bg-blue-600 rounded-lg text-white">
                                    <Save size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-500/10 bg-gray-500/5">
                                <span className="font-medium">{checkpoints.find(c => c.id === selectedCheckpoint)?.name}</span>
                                <button onClick={startRenaming} className="p-1 text-blue-500">
                                    <Edit size={18} />
                                </button>
                            </div>
                        )}
                     </div>

                     {/* NFC Actions */}
                     <div className="space-y-3">
                         <div className="flex items-center justify-between">
                             <label className="text-xs font-bold opacity-50 uppercase">NFC Configuration</label>
                             {antiCloneEnabled && (
                                 <div className="flex items-center space-x-1 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                                     <Lock size={10} />
                                     <span className="font-bold">SECURE MODE</span>
                                 </div>
                             )}
                         </div>
                         
                         {nfcStatus ? (
                             <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center space-y-3 ${
                                 actionFeedback?.status === 'success' ? 'border-green-500 bg-green-500/10' :
                                 actionFeedback?.status === 'error' ? 'border-red-500 bg-red-500/10' :
                                 'border-blue-500 bg-blue-500/10'
                             }`}>
                                 {loadingAction ? (
                                     <Loader2 size={32} className="animate-spin text-blue-500" />
                                 ) : actionFeedback?.status === 'success' ? (
                                     <CheckCircle2 size={32} className="text-green-500" />
                                 ) : actionFeedback?.status === 'error' ? (
                                     <AlertCircle size={32} className="text-red-500" />
                                 ) : (
                                     <Nfc size={32} className="text-blue-500 animate-pulse" />
                                 )}
                                 
                                 <div>
                                     <p className="font-bold text-sm">{nfcStatus}</p>
                                     {loadingAction && <p className="text-xs opacity-60 mt-1">Hold device near tag...</p>}
                                 </div>
                             </div>
                         ) : (
                             <div className="grid grid-cols-2 gap-3">
                                 <button 
                                   onClick={() => handleNfcAction('read')}
                                   className="p-4 rounded-xl border border-gray-500/20 hover:bg-gray-500/5 flex flex-col items-center space-y-2 active:scale-95 transition-all"
                                 >
                                     <ScanLine size={24} className="text-blue-500" />
                                     <span className="text-xs font-bold">Link Existing Tag</span>
                                 </button>
                                 <button 
                                   onClick={() => handleNfcAction('write')}
                                   className="p-4 rounded-xl border border-gray-500/20 hover:bg-gray-500/5 flex flex-col items-center space-y-2 active:scale-95 transition-all"
                                 >
                                     {antiCloneEnabled ? <ShieldCheck size={24} className="text-green-500" /> : <Nfc size={24} className="text-purple-500" />}
                                     <span className="text-xs font-bold">{antiCloneEnabled ? 'Secure Write' : 'Write New Tag'}</span>
                                 </button>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};