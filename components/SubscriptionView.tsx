import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { ArrowLeft, CreditCard, Lock, Unlock, Key, ShieldCheck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SubscriptionViewProps {
  theme: Theme;
  onBack: () => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ theme, onBack }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const subTextColor = theme === 'black' ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    // Determine the end of the current year
    const now = new Date();
    const currentYear = now.getFullYear();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59); // Dec 31st 23:59:59
    setExpiryDate(endOfYear);

    const calculateTimeLeft = () => {
      const currentTime = new Date();
      const difference = endOfYear.getTime() - currentTime.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
        setIsExpired(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleActivate = () => {
      alert("Redirecting to payment gateway for renewal...");
  };

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <CreditCard size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Subscription</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col">
          
          {/* License Info Card */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-lg ${cardBg}`}>
              <div className="flex items-start justify-between">
                  <div className="space-y-1">
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">License to Company</p>
                      <h2 className="font-bold text-lg leading-tight">Kawalan Keselamatan Xteam Sdn Bhd</h2>
                  </div>
                  <div className={`p-2 rounded-lg ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                      <ShieldCheck size={24} className="text-blue-500" />
                  </div>
              </div>
              
              <div className="pt-2 border-t border-gray-500/10">
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1">Serial Number</p>
                  <div className="flex items-center space-x-2">
                      <Key size={14} className="text-blue-500" />
                      <p className="font-mono font-medium tracking-wide">XTEAM-2025-8821-SEC</p>
                  </div>
              </div>
          </div>

          {/* Timer Section */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-4">
              
              {/* Circular Timer Visual */}
              <div className="relative w-64 h-64 flex items-center justify-center">
                  {/* Background Circle */}
                  <div className={`absolute inset-0 rounded-full border-[16px] opacity-10 ${isExpired ? 'border-red-500' : 'border-blue-500'}`}></div>
                  
                  {/* Content */}
                  <div className="text-center space-y-1 z-10">
                      <div className="text-5xl font-black tabular-nums tracking-tighter">
                          {timeLeft?.days || 0}
                      </div>
                      <div className="text-sm font-bold opacity-50 uppercase tracking-widest">Days Left</div>
                      <div className="text-xs opacity-40 pt-2 font-mono">
                          {timeLeft ? `${String(timeLeft.hours).padStart(2,'0')}:${String(timeLeft.minutes).padStart(2,'0')}:${String(timeLeft.seconds).padStart(2,'0')}` : '--:--:--'}
                      </div>
                  </div>

                  {/* Icon Badge */}
                  <div className={`absolute -bottom-2 px-4 py-2 rounded-full border-4 flex items-center space-x-2 shadow-xl ${
                      isExpired 
                        ? 'bg-red-600 border-red-800 text-white' 
                        : (theme === 'black' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-100 text-black')
                  }`}>
                      <Clock size={16} className={isExpired ? "animate-pulse" : "text-blue-500"} />
                      <span className="text-xs font-bold whitespace-nowrap">
                          {expiryDate.toLocaleDateString()}
                      </span>
                  </div>
              </div>

              {/* Status Indicator */}
              <div className={`flex flex-col items-center space-y-3 animate-in fade-in slide-in-from-bottom-4`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 ${
                      isExpired 
                        ? 'bg-red-500/10 border-red-500 text-red-500' 
                        : 'bg-green-500/10 border-green-500 text-green-500'
                  }`}>
                      {isExpired ? <Lock size={32} /> : <Unlock size={32} />}
                  </div>
                  <div className="text-center">
                      <h3 className={`text-xl font-bold uppercase tracking-wide ${
                          isExpired ? 'text-red-500' : 'text-green-500'
                      }`}>
                          {isExpired ? 'Subscription Locked' : 'System Unlocked'}
                      </h3>
                      <p className={`text-xs ${subTextColor} mt-1`}>
                          {isExpired 
                            ? 'Your license has expired. Please renew immediately.' 
                            : 'Standard license active. All features enabled.'}
                      </p>
                  </div>
              </div>

          </div>

          {/* Action Button */}
          <div className="pt-4">
              <button 
                onClick={handleActivate}
                disabled={!isExpired}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 transition-all ${
                    !isExpired 
                        ? (theme === 'black' ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-blue-900/20'
                }`}
              >
                  {isExpired ? (
                      <>
                        <Key size={20} />
                        <span>ACTIVATE LICENSE</span>
                      </>
                  ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>LICENSE ACTIVE</span>
                      </>
                  )}
              </button>
              {!isExpired && (
                  <p className="text-center text-[10px] opacity-30 mt-3">
                      Renewal available 30 days before expiration.
                  </p>
              )}
          </div>

      </main>
    </div>
  );
};