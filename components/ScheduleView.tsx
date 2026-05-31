import React, { useState } from 'react';
import { Theme } from '../types';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronRight, User } from 'lucide-react';

interface ScheduleViewProps {
  theme: Theme;
  onBack: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ theme, onBack }) => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const bgColor = theme === 'black' ? 'bg-black' : 'bg-gray-50';
  const textColor = theme === 'black' ? 'text-white' : 'text-black';
  const borderColor = theme === 'black' ? 'border-neutral-800' : 'border-neutral-200';
  const cardBg = theme === 'black' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200';
  const activeDayBg = 'bg-blue-600 text-white shadow-lg shadow-blue-500/30';
  const inactiveDayBg = theme === 'black' ? 'bg-neutral-800 text-gray-400' : 'bg-white text-gray-500 border border-gray-100';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();

  // Mock Data
  const shifts = [
      { id: 1, day: 1, title: 'Morning Shift', time: '08:00 AM - 08:00 PM', location: 'Main Entrance', status: 'Upcoming' },
      { id: 2, day: 2, title: 'Night Shift', time: '08:00 PM - 08:00 AM', location: 'South Wing', status: 'Scheduled' },
      { id: 3, day: 3, title: 'Morning Shift', time: '08:00 AM - 08:00 PM', location: 'Lobby', status: 'Scheduled' },
      { id: 4, day: 4, title: 'Off Day', time: '-', location: '-', status: 'Off' },
      { id: 5, day: 5, title: 'Night Shift', time: '08:00 PM - 08:00 AM', location: 'Patrol Route A', status: 'Scheduled' },
      { id: 6, day: 6, title: 'Morning Shift', time: '08:00 AM - 08:00 PM', location: 'Main Entrance', status: 'Scheduled' },
      { id: 7, day: 0, title: 'Off Day', time: '-', location: '-', status: 'Off' },
  ];

  const currentShifts = shifts.filter(s => s.day === selectedDay);

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <header className={`h-16 px-4 flex items-center space-x-4 border-b ${borderColor} ${theme === 'black' ? 'bg-neutral-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-500/10 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
           <Calendar size={20} className={theme === 'black' ? 'text-white' : 'text-black'} />
           <h1 className="font-bold text-lg">Schedule</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
          
          {/* Weekly Calendar Strip */}
          <div className="flex justify-between mb-6 overflow-x-auto pb-2 no-scrollbar">
              {days.map((day, index) => (
                  <button 
                    key={index}
                    onClick={() => setSelectedDay(index)}
                    className={`flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-2xl transition-all ${
                        selectedDay === index ? activeDayBg : inactiveDayBg
                    } ${index === today && selectedDay !== index ? 'border-2 border-blue-500' : ''}`}
                  >
                      <span className="text-[10px] font-bold uppercase opacity-80">{day}</span>
                      <span className="text-lg font-black">{new Date().getDate() - today + index}</span> 
                      {/* Simple date calc for demo visuals - in real app use proper date logic */}
                  </button>
              ))}
          </div>

          {/* Shift List */}
          <div className="flex-1 overflow-y-auto space-y-4">
              <h3 className="text-sm font-bold opacity-50 uppercase tracking-wider px-1">
                  {days[selectedDay]} • {currentShifts.length > 0 ? 'Assigned Shifts' : 'No Shifts'}
              </h3>

              {currentShifts.length > 0 ? (
                  currentShifts.map((shift) => (
                      <div key={shift.id} className={`p-5 rounded-2xl border relative overflow-hidden ${cardBg} ${shift.status === 'Off' ? 'opacity-70' : ''}`}>
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                              shift.status === 'Upcoming' ? 'bg-blue-500' : 
                              shift.status === 'Off' ? 'bg-gray-500' : 'bg-green-500'
                          }`} />
                          
                          <div className="flex justify-between items-start mb-4 pl-2">
                              <div>
                                  <h4 className="font-bold text-lg">{shift.title}</h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      shift.status === 'Upcoming' ? 'bg-blue-500/10 text-blue-500' : 
                                      shift.status === 'Off' ? 'bg-gray-500/10 text-gray-500' : 'bg-green-500/10 text-green-500'
                                  }`}>
                                      {shift.status}
                                  </span>
                              </div>
                              <div className={`p-2 rounded-full ${theme === 'black' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                                  <User size={20} className="opacity-50" />
                              </div>
                          </div>

                          <div className="space-y-3 pl-2">
                              <div className="flex items-center space-x-3 text-sm">
                                  <Clock size={16} className="text-blue-500" />
                                  <span className="font-mono font-medium opacity-80">{shift.time}</span>
                              </div>
                              <div className="flex items-center space-x-3 text-sm">
                                  <MapPin size={16} className="text-red-500" />
                                  <span className="font-medium opacity-80">{shift.location}</span>
                              </div>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-40">
                      <Calendar size={48} className="mb-4" />
                      <p>No schedule available for this day.</p>
                  </div>
              )}
          </div>
      </main>
    </div>
  );
};