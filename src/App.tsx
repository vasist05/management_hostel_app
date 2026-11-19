import React from 'react';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/Primitives';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ElectricityPage } from './pages/ElectricityPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RentPaymentsPage } from './pages/RentPaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { RoomsBedsPage } from './pages/RoomsBedsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { StudentsPage } from './pages/StudentsPage';
import { HostelProvider, useHostel } from './services/hostelStore';

const HostelRouter: React.FC = () => {
  const { currentUser, activeModule, toasts, dismissToast } = useHostel();

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardPage />;
      case 'students':
        return <StudentsPage />;
      case 'student-profile':
        return <StudentProfilePage />;
      case 'rooms':
        return <RoomsBedsPage />;
      case 'rent':
        return <RentPaymentsPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'electricity':
        return <ElectricityPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      {currentUser ? <AppShell>{renderModule()}</AppShell> : <LoginPage />}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export default function App() {
  return (
    <HostelProvider>
      <HostelRouter />
    </HostelProvider>
  );
}
