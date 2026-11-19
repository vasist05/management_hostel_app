import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock,
  ShieldAlert,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useHostel } from '../services/hostelStore';
import { NotificationItem } from '../types/hostel';
import { formatIndianDate } from '../utils/formatters';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatusLabel,
} from '../components/ui/Primitives';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    setActiveModule,
    openStudentProfile,
  } = useHostel();

  const [filter, setFilter] = useState<'all' | 'unread' | NotificationItem['category']>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.read;
      if (filter !== 'all' && n.category !== filter) return false;
      return true;
    });
  }, [notifications, filter]);

  const getCategoryMeta = (cat: NotificationItem['category']) => {
    switch (cat) {
      case 'rent_overdue':
        return { icon: AlertCircle, label: 'Overdue Rent', tone: 'rose' as const };
      case 'rent_due':
        return { icon: Clock, label: 'Upcoming Due', tone: 'amber' as const };
      case 'registration':
        return { icon: UserPlus, label: 'Registration', tone: 'emerald' as const };
      case 'vacating':
        return { icon: UserMinus, label: 'Vacating', tone: 'indigo' as const };
      default:
        return { icon: ShieldAlert, label: 'Admin Reminder', tone: 'slate' as const };
    }
  };

  const handleOpenNotification = (n: NotificationItem) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.targetStudentId) {
      openStudentProfile(n.targetStudentId);
    } else if (n.targetModule) {
      setActiveModule(n.targetModule);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Alerts Center"
        title="Notifications & Reminders"
        subtitle={`${unreadCount} unread notifications across rent collections, admissions, vacating, and KYC`}
        actions={
          <Button
            size="sm"
            variant="secondary"
            disabled={unreadCount === 0}
            onClick={markAllNotificationsRead}
          >
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        }
      />

      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
          options={[
            { value: 'all', label: `All (${notifications.length})` },
            { value: 'unread', label: `Unread (${unreadCount})` },
            { value: 'rent_overdue', label: 'Overdue Rent' },
            { value: 'rent_due', label: 'Upcoming Dues' },
            { value: 'registration', label: 'Admissions' },
            { value: 'vacating', label: 'Vacating' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="You are all caught up"
          description="No notifications match the selected category or unread filter."
        />
      ) : (
        <Card padding={false} className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const meta = getCategoryMeta(n.category);
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className={`flex flex-col justify-between gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center ${
                    n.read ? 'bg-white' : 'bg-indigo-50/35'
                  }`}
                >
                  <div
                    onClick={() => handleOpenNotification(n)}
                    className="flex flex-1 cursor-pointer items-start gap-3.5"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        <StatusLabel tone={meta.tone}>{meta.label}</StatusLabel>
                        {!n.read && (
                          <span className="text-xs font-semibold text-indigo-600">Unread</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatIndianDate(n.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!n.read && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markNotificationRead(n.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenNotification(n)}
                    >
                      Open
                    </Button>
                    <button
                      type="button"
                      onClick={() => dismissNotification(n.id)}
                      title="Dismiss"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
