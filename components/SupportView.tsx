import React, { useState } from 'react';
import { Theme } from '../types';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Phone } from 'lucide-react';

interface SupportViewProps {
  theme: Theme;
  onBack: () => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ theme, onBack }) => {
  const [showFaq, setShowFaq] = useState(false);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';

  const faqs = [
    { q: "How do I reset my password?", a: "Contact your supervisor or HQ admin to reset your officer credentials." },
    { q: "NFC tag not scanning?", a: "Ensure NFC is enabled on your device settings and hold the device steady against the tag for 2 seconds." },
    { q: "Can I use the app offline?", a: "Yes, the app works offline. Data will sync automatically when an internet connection is restored." },
    { q: "How to report an incident?", a: "Go to Dashboard > Report Incident (Camera Icon) > Capture Photo > Add Description > Save." }
  ];

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <HelpCircle size={20} />
           <h1 className="font-bold text-lg">Support</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
             <div className={`p-6 rounded-full ${theme === 'black' ? 'bg-neutral-800' : 'bg-white shadow-lg border border-gray-100'}`}>
                <MessageSquare size={48} className="text-blue-500" />
             </div>
             <div className="text-center">
                 <h2 className="text-xl font-bold">How can we help?</h2>
                 <p className="text-sm opacity-60 max-w-xs mx-auto mt-1">
                     Browse our FAQ below or contact support directly for urgent assistance.
                 </p>
             </div>
          </div>

          {/* FAQ Button */}
          <button 
            onClick={() => setShowFaq(!showFaq)}
            className={`w-full p-5 rounded-2xl border flex items-center justify-between active:scale-95 transition-all ${cardBg} ${showFaq ? 'ring-2 ring-blue-500/50' : ''}`}
          >
              <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${theme === 'black' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      <HelpCircle size={24} />
                  </div>
                  <span className="font-bold text-lg">Frequently Asked Questions</span>
              </div>
              {showFaq ? <ChevronUp size={20} className="opacity-50" /> : <ChevronDown size={20} className="opacity-50" />}
          </button>

          {/* FAQ List */}
          {showFaq && (
              <div className="space-y-3 animate-in slide-in-from-top-4 fade-in duration-300">
                  {faqs.map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${cardBg}`}>
                          <h3 className="font-bold text-sm mb-1 text-blue-500">{item.q}</h3>
                          <p className="text-xs opacity-70 leading-relaxed">{item.a}</p>
                      </div>
                  ))}
              </div>
          )}

          {/* Contact Section */}
          <div className="pt-8 border-t border-gray-500/10">
              <p className="text-[10px] font-bold opacity-50 uppercase mb-3">Contact Us</p>
              <button 
                onClick={() => window.location.href = 'tel:+60388215566'}
                className={`w-full p-4 rounded-xl border flex items-center space-x-4 active:scale-95 transition-all ${cardBg}`}
              >
                  <div className={`p-3 rounded-xl ${theme === 'black' ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                      <Phone size={24} />
                  </div>
                  <div className="text-left">
                      <span className="font-bold block">Call Support Hotline</span>
                      <span className="text-xs opacity-60">+60 3-8821 5566</span>
                  </div>
              </button>
          </div>
      </main>
    </div>
  );
};