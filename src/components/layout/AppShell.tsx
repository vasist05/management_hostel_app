import React, { useState } from 'react';
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useHostel } from '../../services/hostelStore';
import { NavModule } from '../../types/hostel';
import { cn, getInitials } from '../../utils/formatters';

interface NavItem {
  id: NavModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'rooms', label: 'Rooms & Beds', icon: BedDouble },
  { id: 'rent', label: 'Rent & Payments', icon: IndianRupee },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'electricity', label: 'Electricity', icon: Zap },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MODULE_TITLES: Record<NavModule, string> = {
  dashboard: 'Dashboard',
  students: 'Students & Tenants',
  'student-profile': 'Students / Tenant Profile',
  rooms: 'Rooms & Beds',
  rent: 'Rent & Payments',
  expenses: 'Expenses',
  electricity: 'Electricity',
  documents: 'Documents & KYC',
  notifications: 'Notifications',
  reports: 'Reports & Analytics',
  settings: 'Settings',
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeModule,
    setActiveModule,
    currentUser,
    staff,
    switchUserRole,
    logout,
    settings,
    notifications,
    documents,
  } = useHostel();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingDocs = documents.filter((d) => d.status === 'pending').length;

  const isNavActive = (id: NavModule) =>
    activeModule === id || (id === 'students' && activeModule === 'student-profile');

  const handleNav = (id: NavModule) => {
    setActiveModule(id);
    setMobileOpen(false);
  };

  const SidebarBody = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            {(!collapsed || isMobile) && (
              <span className="font-display truncate text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
                HOSTEL MANAGER V4.1
              </span>
            )}
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="space-y-0.5 p-3" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.id);
            const count =
              item.id === 'notifications'
                ? unreadCount
                : item.id === 'documents'
                ? pendingDocs
                : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                title={collapsed && !isMobile ? item.label : undefined}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <span className="flex items-center gap-3 overflow-hidden">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-indigo-600' : 'text-slate-400'
                    )}
                  />
                  {(!collapsed || isMobile) && (
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  )}
                </span>
                {(!collapsed || isMobile) && count > 0 && (
                  <span className="font-mono text-xs font-semibold text-rose-600 tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-3">
        {(!collapsed || isMobile) && (
          <div className="mb-2.5 px-2 text-xs text-slate-500">
            <p className="font-medium text-slate-700">Demo Storage Mode</p>
            <p className="mt-0.5 leading-snug text-slate-500">
              Data stored locally in browser. Ready for PostgreSQL.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && <span className="whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          'no-print hidden shrink-0 border-r border-slate-200 bg-white transition-all duration-200 lg:block',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarBody />
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/45" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-72 max-w-[85vw] shadow-xl">
            <SidebarBody isMobile />
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
          {/* Left: Collapse / Menu + Contextual Breadcrumb */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              className="hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:inline-flex"
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="truncate font-semibold text-slate-900">{settings.hostelName}</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="hidden truncate text-slate-500 sm:inline">
                {MODULE_TITLES[activeModule]}
              </span>
            </div>
          </div>

          {/* Right: Notifications & Profile Switcher */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModule('notifications')}
              aria-label="Open notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="relative border-l border-slate-200 pl-2">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {getInitials(currentUser?.name || 'Owner')}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold leading-tight text-slate-900">
                    {currentUser?.name}
                  </p>
                  <p className="text-[11px] capitalize leading-tight text-slate-500">
                    {currentUser?.role}
                  </p>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-900">{currentUser?.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{currentUser?.email}</p>
                    </div>
                    <div className="py-1.5">
                      <p className="px-3 py-1 text-[11px] font-medium text-slate-400">
                        Switch Active Role
                      </p>
                      {staff
                        .filter((u) => u.active)
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              switchUserRole(u.id);
                              setProfileMenuOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs',
                              u.id === currentUser?.id
                                ? 'bg-indigo-50 font-semibold text-indigo-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            )}
                          >
                            <span>{u.name}</span>
                            <span className="capitalize text-slate-400">{u.role}</span>
                          </button>
                        ))}
                    </div>
                    <div className="border-t border-slate-100 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setActiveModule('settings');
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" /> Account &amp; Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1380px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};
