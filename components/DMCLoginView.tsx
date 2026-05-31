import React, { useState } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Lock, User, LogIn, AlertCircle } from 'lucide-react';

interface DMCLoginViewProps {
  theme: Theme;
  onBack: () => void;
}

export const DMCLoginView: React.FC<DMCLoginViewProps> = ({ theme, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login delay
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        // Success logic here (e.g., navigate to DMC dashboard)
        alert('Login Successful! (Demo)');
        setIsLoading(false);
      } else {
        setError('Invalid credentials');
        setIsLoading(false);
      }
    }, 1500);
  };

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const inputBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800 focus:border-indigo-500' : 'bg-white border-gray-200 focus:border-indigo-500';

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">DMC Login</h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-sm opacity-60">Sign in to access the Data Management Console</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-70 ml-1">Username</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${inputBg}`}
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-70 ml-1">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${inputBg}`}
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center space-x-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs opacity-40">Restricted Access. Authorized Personnel Only.</p>
          </div>
        </div>
      </main>
    </div>
  );
};
