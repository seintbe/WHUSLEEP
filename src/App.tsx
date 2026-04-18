/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppStore } from '@/store';
import { AiButtonAssistantProvider } from '@/components/AiButtonAssistantProvider';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import Timeline from '@/pages/Timeline';
import Map from '@/pages/Map';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import Social from '@/pages/Social';
import Chat from '@/pages/Chat';
import MessageBoard from '@/pages/MessageBoard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { scheduleImported } = useAppStore();
  if (!scheduleImported) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={
        <div className="app-shell min-h-screen bg-background text-on-background font-body px-4 pb-24 pt-16 sm:px-6 sm:pt-20">
          <Onboarding />
        </div>
      } />
      <Route element={<Layout />}>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
        <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
        <Route path="/messageboard" element={<ProtectedRoute><MessageBoard /></ProtectedRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AiButtonAssistantProvider>
          <AppRoutes />
        </AiButtonAssistantProvider>
      </BrowserRouter>
    </AppProvider>
  );
}
