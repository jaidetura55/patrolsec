import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { MainLayout } from './components/MainLayout';
import { Theme } from './types';

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'login' | 'dashboard'>('splash');
  const [theme, setTheme] = useState<Theme>('black');

  // Splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppState('login');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'black' ? 'white' : 'black');
  };

  const handleLogin = () => {
    setAppState('dashboard');
  };

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col transition-colors duration-500 ${theme === 'black' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {appState === 'splash' && <LandingPage theme={theme} />}
      {appState === 'login' && <LoginPage theme={theme} onLogin={handleLogin} />}
      {appState === 'dashboard' && <MainLayout theme={theme} toggleTheme={toggleTheme} />}
    </div>
  );
}