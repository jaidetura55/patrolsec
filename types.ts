import React from 'react';

export type Theme = 'black' | 'white';

export interface MenuItem {
  icon: React.ReactNode;
  label: string;
  action?: () => void;
}

export type ViewState = 'dashboard' | 'camera' | 'clocking' | 'support' | 'settings' | 'checkpointSettings' | 'biometricSettings' | 'speedtest' | 'history' | 'zoneSettings' | 'registerZone' | 'registerOfficer' | 'deleteOfficer' | 'visitor' | 'logbook' | 'about' | 'subscription' | 'diagnose' | 'antitheft' | 'antiClone' | 'schedule' | 'nationalDisaster' | 'geofencing' | 'dmcLogin';

export interface Checkpoint {
  id: number;
  position: string;
  name: string;
  nfcId?: string | null;
  status?: 'pending' | 'scanning' | 'completed';
  timestamp?: string;
}

export interface Zone {
  id?: number;
  country: string;
  zoneName: string; // Outlet Name / Location
  officerName: string;
  officerId: string;
  unit: string;
  shift: 'Day' | 'Night';
  biometrics: {
    face: boolean;
    fingerprint: boolean;
  };
  isActive: boolean;
  timestamp: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Visitor {
  id?: number;
  name: string;
  nric?: string;
  vehicle?: string;
  purpose: string;
  passId: string;
  inTime: string;
  outTime?: string;
  date: string;
  status: 'Active' | 'Checked Out';
  photos?: {
      face?: string;
      vehicle?: string;
      id?: string;
      faceVideo?: string; // Base64 video data string
  };
}