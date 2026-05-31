import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Copy, Shield, ShieldCheck, ShieldAlert, Cpu, Fingerprint, RefreshCcw, Lock, Unlock, Zap, Loader2, AlertTriangle, Globe, Clock } from 'lucide-react';
import { dbService } from '../services/db';

interface AntiCloneViewProps {
  theme: Theme;
  onBack: () => void;
}

export const AntiCloneView: React.FC<AntiCloneViewProps> = ({ theme, onBack }) => {
  const [challengeA, setChallengeA] = useState(false);
  const [challengeKey, setChallengeKey] = useState<string>('');
  const [isLoadingA, setIsLoadingA] = useState(false);

  const [challengeB, setChallengeB] = useState(false);
  const [challengeC, setChallengeC] = useState(false);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const subText = theme === 'black' ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    // Load initial state
    const loadSettings = async () => {
        const enabledA = await dbService.getSetting('anti_clone_challenge_a', false);
        const keyA = await dbService.getSetting('anti_clone_key_a', '');
        const enabledB = await dbService.getSetting('anti_clone_challenge_b', false);
        const enabledC = await dbService.getSetting('anti_clone_challenge_c', false);
        
        setChallengeA(enabledA);
        setChallengeKey(keyA);
        setChallengeB(enabledB);
        setChallengeC(enabledC);
    };
    loadSettings();
  }, []);

  const toggleChallengeA = async () => {
    const newState = !challengeA;
    setIsLoadingA(true);

    if (newState) {
        // Simulate generating and writing random protection code
        await new Promise(resolve => setTimeout(resolve, 2000));
        const randomKey = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
        const secureKey = `SEC-${randomKey}`;
        
        setChallengeKey(secureKey);
        await dbService.saveSetting('anti_clone_key_a', secureKey);
        await dbService.logAction('ANTI_CLONE', `Challenge A Enabled. Key: ${secureKey}`);
    } else {
        setChallengeKey('');
        await dbService.saveSetting('anti_clone_key_a', '');
        await dbService.logAction('ANTI_CLONE', `Challenge A Disabled.`);
    }

    setChallengeA(newState);
    await dbService.saveSetting('anti_clone_challenge_a', newState);
    setIsLoadingA(false);
  };

  const toggleChallengeB = async () => {
      const newState = !challengeB;
      setChallengeB(newState);
      await dbService.saveSetting('anti_clone_challenge_b', newState);
  };

  const toggleChallengeC = async () => {
      const newState = !challengeC;
      setChallengeC(newState);
      await dbService.saveSetting('anti_clone_challenge_c', newState);
  };

  const ChallengeCard = ({ 
    title, 
    description, 
    active, 
    loading,
    onClick, 
    icon, 
    detail 
  }: { 
    title: string, 
    description: string, 
    active: boolean, 
    loading?: boolean,
    onClick: () => void, 
    icon: React.ReactNode,
    detail?: string 
  }) => (
      <div className={`p-5 rounded-2xl border transition-all ${cardBg} ${active ? 'border-green-500/50 shadow-lg shadow-green-900/10' : ''}`}>
          <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${active ? 'bg-green-500/10 text-green-500' : (theme === 'black' ? 'bg-neutral-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                      {icon}
                  </div>
                  <div>
                      <h3 className="font-bold text-base">{title}</h3>
                      <p className={`text-xs ${subText} mt-0.5`}>{active ? 'Protection Active' : 'Disabled'}</p>
                  </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          </div>
          
          <p className={`text-sm leading-relaxed mb-4 ${theme === 'black' ? 'opacity-70' : 'opacity-80'}`}>
              {description}
          </p>

          {active && detail && (
              <div className={`mb-4 p-3 rounded-lg border font-mono text-xs break-all flex items-center space-x-2 ${theme === 'black' ? 'bg-black/50 border-neutral-800 text-green-400' : 'bg-gray-50 border-gray-200 text-green-600'}`}>
                  <Lock size={12} className="flex-shrink-0" />
                  <span>{detail}</span>
              </div>
          )}

          <button 
             onClick={onClick}
             disabled={loading}
             className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all ${
                 active 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
             }`}
          >
              {loading ? (
                  <Loader2 size={18} className="animate-spin" />
              ) : active ? (
                  <>
                    <Unlock size={18} />
                    <span>Disable Protection</span>
                  </>
              ) : (
                  <>
                    <Lock size={18} />
                    <span>Enable Protection</span>
                  </>
              )}
          </button>
      </div>
  );

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <Copy size={20} className="text-red-500" />
           <h1 className="font-bold text-lg">Anti Clone</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
          
          <div className="flex flex-col items-center space-y-4 py-4 text-center">
              <div className="relative">
                 <Shield size={64} className={challengeA || challengeB || challengeC ? "text-green-500" : "text-gray-500"} />
                 {(challengeA || challengeB || challengeC) && (
                     <div className="absolute inset-0 flex items-center justify-center">
                         <ShieldCheck size={32} className="text-white" />
                     </div>
                 )}
              </div>
              <div>
                  <h2 className="text-2xl font-black uppercase">Cloning Defense</h2>
                  <p className={`text-xs ${subText} mt-2 max-w-xs mx-auto leading-relaxed`}>
                      Configure advanced security protocols to prevent NFC tag cloning and replay attacks during guard clocking.
                  </p>
              </div>
          </div>

          {/* Status Summary Dashboard */}
          <div className={`p-4 rounded-2xl border ${theme === 'black' ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Security Status</h3>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${challengeA || challengeB || challengeC ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                      {challengeA || challengeB || challengeC ? 'Protected' : 'Unprotected'}
                  </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between text-sm">
                      <span className="opacity-60">Anti-Clone Protection</span>
                      <span className={`font-bold ${challengeA ? 'text-green-500' : 'text-red-500'}`}>
                          {challengeA ? 'ENABLED' : 'DISABLED'}
                      </span>
                  </div>
                  {challengeA && challengeKey && (
                      <div className="flex flex-col space-y-1 pt-2 border-t border-gray-500/10">
                          <span className="text-[10px] font-bold uppercase opacity-40 tracking-tighter">Current Security Key</span>
                          <div className={`p-2 rounded-lg font-mono text-xs break-all flex items-center justify-between ${theme === 'black' ? 'bg-black text-green-400' : 'bg-gray-50 text-green-600'}`}>
                              <span>{challengeKey}</span>
                              <ShieldCheck size={14} className="flex-shrink-0 ml-2" />
                          </div>
                      </div>
                  )}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-500/10">
                      <span className="opacity-60">Time-Window Verification</span>
                      <span className={`font-bold ${challengeB ? 'text-green-500' : 'text-gray-500'}`}>
                          {challengeB ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-500/10">
                      <span className="opacity-60">Geo-Fencing Lock</span>
                      <span className={`font-bold ${challengeC ? 'text-green-500' : 'text-gray-500'}`}>
                          {challengeC ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                  </div>
              </div>
          </div>

          <div className="space-y-4">
              <h3 className="text-xs font-bold opacity-50 uppercase tracking-widest px-1">Security Protocols</h3>
              
              {/* Challenge A */}
              <ChallengeCard 
                  title="Challenge A"
                  description="Writes a random protection code to the NFC chip during each scan. The system verifies this rolling code to detect cloned static tags."
                  active={challengeA}
                  loading={isLoadingA}
                  onClick={toggleChallengeA}
                  icon={<RefreshCcw size={24} />}
                  detail={challengeKey ? `Active Key: ${challengeKey}` : undefined}
              />

              {/* Challenge B */}
              <ChallengeCard 
                  title="Challenge B"
                  description="Enforces strict time-based verification window. Tags scanned outside expected latency windows are flagged as potential emulators."
                  active={challengeB}
                  onClick={toggleChallengeB}
                  icon={<Clock size={24} />}
              />

              {/* Challenge C */}
              <ChallengeCard 
                  title="Challenge C"
                  description="Geo-fencing lock. Validates that the tag physical coordinates match the encoded geolocation data."
                  active={challengeC}
                  onClick={toggleChallengeC}
                  icon={<Globe size={24} />}
              />
          </div>
          
          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${theme === 'black' ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                  <h4 className="font-bold text-sm text-red-500">Warning</h4>
                  <p className="text-xs opacity-70 mt-1 leading-relaxed">
                      Enabling Write Protection (Challenge A) requires compatible rewritable NFC tags. Older tags may lock permanently.
                  </p>
              </div>
          </div>

      </main>
    </div>
  );
};