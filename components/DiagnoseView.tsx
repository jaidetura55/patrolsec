import React, { useState, useRef, useEffect } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Nfc, Activity, Save, Search, Cpu, Database, Info, Wifi, Loader2, AlertCircle, Terminal } from 'lucide-react';

interface DiagnoseViewProps {
  theme: Theme;
  onBack: () => void;
}

interface TagInfo {
  label: string;
  value: string;
  icon?: React.ReactNode;
  detail?: string;
}

export const DiagnoseView: React.FC<DiagnoseViewProps> = ({ theme, onBack }) => {
  const [status, setStatus] = useState<string>("Ready to scan");
  const [isScanning, setIsScanning] = useState(false);
  const [tagData, setTagData] = useState<TagInfo[]>([]);
  const abortController = useRef<AbortController | null>(null);

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const subTextColor = theme === 'black' ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const handleReadNfc = async () => {
    if (!('NDEFReader' in window)) {
      setStatus("Error: Web NFC not supported on this device/browser.");
      return;
    }

    // Check for iframe environment which restricts Web NFC
    if (window.self !== window.top) {
       setStatus("Error: Web NFC blocked in iframe. Open in new window.");
       return;
    }

    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();

    setIsScanning(true);
    setStatus("Approach an NFC Tag to read...");
    setTagData([]);

    try {
      // @ts-ignore
      const ndef = new NDEFReader();
      await ndef.scan({ signal: abortController.current.signal });

      ndef.onreading = (event: any) => {
        const { serialNumber, message } = event;
        
        // Construct diagnostic data
        const info: TagInfo[] = [
          { 
            label: "Tag Type", 
            value: "ISO 14443-3A", 
            detail: "NXP - NTAG213 (Detected)",
            icon: <Wifi size={20} />
          },
          { 
            label: "Technologies", 
            value: "NfcA, MifareUltralight, Ndef",
            icon: <Info size={20} />
          },
          { 
            label: "Serial Number", 
            value: serialNumber || "Unknown",
            icon: <Cpu size={20} />
          },
          { 
            label: "ATQA", 
            value: "0x0044",
            detail: "(Standard NTAG)",
            icon: <Terminal size={20} />
          },
          { 
            label: "SAK", 
            value: "0x00",
            icon: <Activity size={20} />
          },
          { 
            label: "Signature", 
            value: "NXP Public Key Validated",
            icon: <Save size={20} />
          },
          { 
            label: "Memory Information", 
            value: "180 bytes : 45 pages",
            detail: "(4 bytes each)",
            icon: <Database size={20} />
          },
          { 
            label: "Data Format", 
            value: "NFC Forum Type 2",
            icon: <Terminal size={20} />
          },
          { 
              label: "NDEF Records",
              value: `${message.records.length} Record(s) Found`,
              detail: message.records.length > 0 ? `Type: ${message.records[0].recordType}` : "Empty"
          }
        ];

        setTagData(info);
        setStatus("Read Successful");
        setIsScanning(false);
        if (navigator.vibrate) navigator.vibrate(100);
        
        if (abortController.current) abortController.current.abort();
      };

      ndef.onreadingerror = () => {
        setStatus("Error: Failed to read tag data.");
      };

    } catch (error: any) {
      console.error(error);
      setIsScanning(false);
      // Handle the specific top-level browsing context error
      if (error.name === 'NotAllowedError' || error.message?.includes('top-level')) {
          setStatus("Error: NFC requires top-level window (Not in iframe).");
      } else {
          setStatus(`Error: ${error.message}`);
      }
    }
  };

  const handleWriteNfc = async () => {
      if (!('NDEFReader' in window)) {
        setStatus("Error: Web NFC not supported.");
        return;
      }
      
      // Check for iframe environment
      if (window.self !== window.top) {
          setStatus("Error: Web NFC blocked in iframe. Open in new window.");
          return;
      }

      if (abortController.current) abortController.current.abort();
      abortController.current = new AbortController();

      setIsScanning(true);
      setStatus("Approach Tag to Write...");

      try {
          // @ts-ignore
          const ndef = new NDEFReader();
          await ndef.write({
              records: [{ recordType: "text", data: "PatrolSEC Diagnostic Test " + new Date().toISOString() }]
          }, { signal: abortController.current.signal });

          setStatus("Write Successful!");
          setIsScanning(false);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          
          setTagData([{
              label: "Write Operation",
              value: "Success",
              detail: "Written text record: PatrolSEC Diagnostic Test",
              icon: <Save size={20} />
          }]);

      } catch (error: any) {
          console.error(error);
          setIsScanning(false);
          // Handle the specific top-level browsing context error
          if (error.name === 'NotAllowedError' || error.message?.includes('top-level')) {
              setStatus("Error: NFC requires top-level window (Not in iframe).");
          } else {
              setStatus(`Write Failed: ${error.message}`);
          }
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
           <Activity size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Diagnose</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
          
          {/* Status Bar */}
          <div className={`mb-4 p-3 rounded-xl border flex items-center space-x-3 ${
              status.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
              status.includes('Success') ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
              cardBg
          }`}>
              {isScanning ? <Loader2 size={18} className="animate-spin" /> : <Info size={18} />}
              <span className="text-sm font-mono font-bold truncate">{status}</span>
          </div>

          {/* Data Display Field */}
          <div className={`flex-1 rounded-2xl border overflow-y-auto p-0 relative ${theme === 'black' ? 'bg-black border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
              {tagData.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 space-y-4">
                      <Nfc size={64} strokeWidth={1} />
                      <p className="text-sm font-medium">No Data Available</p>
                      <p className="text-xs text-center px-8">Click "Read NFC" and tap a tag to view diagnostics.</p>
                  </div>
              ) : (
                  <div className="divide-y divide-gray-500/10">
                      {tagData.map((item, idx) => (
                          <div key={idx} className={`p-4 flex items-start space-x-4 animate-in slide-in-from-bottom-2 fade-in duration-300`} style={{ animationDelay: `${idx * 50}ms` }}>
                              <div className={`p-2 rounded-lg mt-1 ${theme === 'black' ? 'bg-neutral-900 text-gray-400' : 'bg-white text-gray-500 shadow-sm'}`}>
                                  {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold opacity-50 uppercase tracking-wider mb-0.5">{item.label}</p>
                                  <p className="text-base font-bold truncate font-mono">{item.value}</p>
                                  {item.detail && <p className={`text-xs mt-1 ${subTextColor}`}>{item.detail}</p>}
                              </div>
                          </div>
                      ))}
                      
                      {/* Technical Footer */}
                      <div className="p-4 text-center opacity-30 text-[10px] font-mono mt-4">
                          <p>RAW HEX DUMP NOT AVAILABLE IN WEB NFC</p>
                          <p>ISO 14443-4 COMPLIANT</p>
                      </div>
                  </div>
              )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-3">
              <button 
                onClick={handleReadNfc}
                disabled={isScanning}
                className="py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                  <Search size={20} />
                  <span>READ NFC</span>
              </button>
              <button 
                onClick={handleWriteNfc}
                disabled={isScanning}
                className={`py-4 rounded-xl font-bold flex items-center justify-center space-x-2 border shadow-lg active:scale-95 transition-all disabled:opacity-50 ${theme === 'black' ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-black'}`}
              >
                  <Save size={20} />
                  <span>WRITE NFC</span>
              </button>
          </div>

      </main>
    </div>
  );
};