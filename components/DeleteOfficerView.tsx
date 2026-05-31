import React, { useEffect, useState } from 'react';
import { Theme, Zone } from '../types';
import { ArrowLeft, UserMinus, AlertCircle, Trash2, Shield, User, Loader2 } from 'lucide-react';
import { dbService } from '../services/db';

interface DeleteOfficerViewProps {
  theme: Theme;
  onBack: () => void;
}

interface OfficerInfo {
    id: string;
    name: string;
    zoneName: string;
}

export const DeleteOfficerView: React.FC<DeleteOfficerViewProps> = ({ theme, onBack }) => {
  const [officers, setOfficers] = useState<OfficerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
      setLoading(true);
      try {
          const zones = await dbService.getZones();
          // Filter zones that have assigned officers
          const assignedZones = zones.filter(z => z.officerId && z.officerName !== 'Unassigned');
          
          const list: OfficerInfo[] = assignedZones.map(z => ({
              id: z.officerId,
              name: z.officerName,
              zoneName: z.zoneName
          }));
          
          setOfficers(list);
          setLoading(false);
      } catch (e) {
          console.error("Failed to load officers", e);
          setLoading(false);
      }
  };

  const confirmDelete = async () => {
      if (!selectedOfficer) return;
      
      setIsDeleting(true);
      try {
          await dbService.deleteOfficer(selectedOfficer.id);
          
          // Simulate sync delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setIsDeleting(false);
          setSelectedOfficer(null);
          loadOfficers(); // Refresh list
          alert(`Officer ${selectedOfficer.name} removed successfully.`);
      } catch (e) {
          console.error("Failed to delete officer", e);
          setIsDeleting(false);
          alert("Error removing officer.");
      }
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <UserMinus size={20} className="text-red-500" />
           <h1 className="font-bold text-lg">Delete Officer</h1>
        </div>
      </header>

      {/* List */}
      <main className="flex-1 p-6 overflow-y-auto">
          <p className="text-xs opacity-50 mb-4 font-bold uppercase tracking-wider px-1">
              Select Officer to Remove
          </p>

          {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-3">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-xs">Loading Officers...</p>
              </div>
          ) : officers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                  <div className={`p-6 rounded-full ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                      <User size={40} />
                  </div>
                  <p className="text-sm font-medium">No officers assigned to zones.</p>
              </div>
          ) : (
              <div className="space-y-3">
                  {officers.map((officer) => (
                      <button 
                          key={officer.id}
                          onClick={() => setSelectedOfficer(officer)}
                          className={`w-full p-4 rounded-xl border flex items-center justify-between group active:scale-95 transition-all ${cardBg} hover:border-red-500/50`}
                      >
                          <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme === 'black' ? 'bg-neutral-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                  <User size={24} />
                              </div>
                              <div className="text-left">
                                  <h3 className="font-bold text-sm">{officer.name}</h3>
                                  <div className="flex items-center space-x-2 text-xs opacity-60 mt-0.5">
                                      <span className="font-mono bg-gray-500/20 px-1 rounded">{officer.id}</span>
                                      <span>•</span>
                                      <span>{officer.zoneName}</span>
                                  </div>
                              </div>
                          </div>
                          <Trash2 size={20} className="opacity-30 group-hover:text-red-500 group-hover:opacity-100 transition-all" />
                      </button>
                  ))}
              </div>
          )}
      </main>

      {/* Confirmation Modal */}
      {selectedOfficer && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-sm rounded-2xl p-6 border shadow-2xl space-y-6 ${theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'}`}>
                  <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center animate-bounce">
                          <AlertCircle size={32} />
                      </div>
                      
                      <div>
                          <h2 className="text-xl font-bold">Remove Officer?</h2>
                          <p className="text-sm opacity-60 mt-2 leading-relaxed">
                              Are you sure you want to delete <span className="font-bold text-red-500">{selectedOfficer.name}</span>?
                          </p>
                      </div>

                      <div className={`w-full p-4 rounded-xl text-left text-xs space-y-2 ${theme === 'black' ? 'bg-black border border-neutral-800' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className="font-bold uppercase opacity-50 mb-2">This action will delete:</p>
                          <div className="flex items-center space-x-2 opacity-80">
                              <Shield size={12} className="text-red-500" />
                              <span>Face ID Data</span>
                          </div>
                          <div className="flex items-center space-x-2 opacity-80">
                              <Shield size={12} className="text-red-500" />
                              <span>Fingerprint Records</span>
                          </div>
                          <div className="flex items-center space-x-2 opacity-80">
                              <Shield size={12} className="text-red-500" />
                              <span>Shift Assignments</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex space-x-3">
                      <button 
                          onClick={() => setSelectedOfficer(null)}
                          className={`flex-1 py-3 rounded-xl font-bold ${theme === 'black' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                          disabled={isDeleting}
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete}
                          className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-red-900/20"
                          disabled={isDeleting}
                      >
                          {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};