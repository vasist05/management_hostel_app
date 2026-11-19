import React, { useState } from 'react';
import {
  Database,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Users,
} from 'lucide-react';
import { POSTGRES_SCHEMA_PREVIEW } from '../data/mockData';
import { useHostel } from '../services/hostelStore';
import { UserRole } from '../types/hostel';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatusLabel,
} from '../components/ui/Primitives';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    staff,
    currentUser,
    updateSettings,
    addStaffMember,
    toggleStaffStatus,
    resetDemoData,
  } = useHostel();

  const [tab, setTab] = useState<'property' | 'billing' | 'staff' | 'preferences' | 'backend'>(
    'property'
  );
  const [form, setForm] = useState(settings);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'warden' as UserRole,
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...form,
      rentDueDay: Number(form.rentDueDay),
      lateFeePerDay: Number(form.lateFeePerDay),
      defaultSecurityMonths: Number(form.defaultSecurityMonths),
      notifyRentDueDaysBefore: Number(form.notifyRentDueDaysBefore),
    });
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim()) return;
    addStaffMember({
      name: staffForm.name.trim(),
      email: staffForm.email.trim(),
      phone: staffForm.phone.trim(),
      role: staffForm.role,
      active: true,
    });
    setStaffForm({ name: '', email: '', phone: '', role: 'warden' });
    setAddStaffOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Configuration"
        title="Settings & Administration"
        subtitle="Configure property details, rent rules, UPI/bank receipts, staff access, and preferences."
      />

      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: 'property', label: 'Property Info' },
            { value: 'billing', label: 'Rent & Payment' },
            { value: 'staff', label: `Staff & Roles (${staff.length})` },
            { value: 'preferences', label: 'Notifications & App' },
            { value: 'backend', label: 'PostgreSQL / Demo Mode' },
          ]}
        />
      </div>

      {tab === 'property' && (
        <Card>
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Hostel / PG Information
              </h2>
              <p className="text-xs text-slate-500">
                Appears on receipts, reports, and the top workspace header.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Hostel / PG Name"
                value={form.hostelName}
                onChange={(e) => setForm({ ...form, hostelName: e.target.value })}
                required
              />
              <Input
                label="Tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
              <Input
                label="Street Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
              <Input
                label="PIN Code"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
              <Input
                label="Contact Phone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
              <Input
                label="Contact Email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
              <Input
                label="GSTIN (Optional)"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              />
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button type="submit">
                <Save className="h-4 w-4" /> Save Property Info
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'billing' && (
        <Card>
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Room, Rent &amp; Payment Settings
              </h2>
              <p className="text-xs text-slate-500">
                Default billing cycle rules, UPI collection ID, and bank account details.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Monthly Rent Due Day (1–28)"
                type="number"
                min={1}
                max={28}
                value={form.rentDueDay}
                onChange={(e) => setForm({ ...form, rentDueDay: Number(e.target.value) })}
              />
              <Input
                label="Late Fee per Day (₹)"
                type="number"
                min={0}
                value={form.lateFeePerDay}
                onChange={(e) => setForm({ ...form, lateFeePerDay: Number(e.target.value) })}
              />
              <Input
                label="Default Security Deposit (Months)"
                type="number"
                min={0}
                max={6}
                value={form.defaultSecurityMonths}
                onChange={(e) =>
                  setForm({ ...form, defaultSecurityMonths: Number(e.target.value) })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Primary UPI ID (For Rent Collection)"
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              />
              <Input
                label="Bank Account Details"
                value={form.bankDetails}
                onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
              />
            </div>

            <Input
              label="Receipt Footer Note"
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
            />

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button type="submit">
                <Save className="h-4 w-4" /> Save Billing Rules
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          <Card className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Active Profile &amp; Staff Accounts
              </h2>
              <p className="text-xs text-slate-500">
                Signed in as <strong>{currentUser?.name}</strong> ({currentUser?.role}) · Role-based
                structure ready for Owner, Manager, Warden, and Accountant.
              </p>
            </div>
            <Button size="sm" onClick={() => setAddStaffOpen(true)}>
              <Plus className="h-4 w-4" /> Add Staff Member
            </Button>
          </Card>

          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Staff Member</th>
                    <th className="px-4 py-3.5">Email &amp; Phone</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Access</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <p>{u.email}</p>
                        <p className="font-mono text-slate-500">{u.phone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusLabel tone="indigo">{u.role}</StatusLabel>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusLabel tone={u.active ? 'emerald' : 'slate'}>
                          {u.active ? 'Active' : 'Disabled'}
                        </StatusLabel>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={u.id === currentUser?.id}
                          onClick={() => toggleStaffStatus(u.id)}
                        >
                          {u.active ? 'Disable' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'preferences' && (
        <Card>
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Notification &amp; Application Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Configure rent reminders and workspace defaults.
              </p>
            </div>

            <div className="max-w-xs">
              <Input
                label="Remind Tenants Before Due Date (Days)"
                type="number"
                min={1}
                max={15}
                value={form.notifyRentDueDaysBefore}
                onChange={(e) =>
                  setForm({ ...form, notifyRentDueDaysBefore: Number(e.target.value) })
                }
              />
            </div>

            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {(
                [
                  [
                    'autoGenerateRentOnFirst',
                    'Auto-generate monthly rent ledger on 1st of every month',
                    'Creates pending rent entries for all active tenants automatically.',
                  ],
                  [
                    'whatsappRemindersEnabled',
                    'WhatsApp Rent Reminder Templates',
                    'Prepare Indian INR rent due notifications for WhatsApp dispatch.',
                  ],
                  [
                    'smsRemindersEnabled',
                    'SMS Payment Confirmations',
                    'Send automated receipt reference alerts upon recording payment.',
                  ],
                ] as const
              ).map(([key, title, desc]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-4 py-3.5"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(form[key])}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                <Save className="h-4 w-4" /> Save Preferences
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'backend' && (
        <div className="space-y-5">
          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Database className="h-4 w-4 text-indigo-600" /> Demo Mode &amp; Database
                  Readiness
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  HOSTEL MANAGER V4.1 currently runs in <strong>Local Demo Mode</strong> using
                  browser storage so every interaction works immediately without requiring a live
                  database server. No changes are sent to an external database yet. The repository
                  layer (<code className="font-mono text-indigo-700">IHostelRepository</code>) is
                  structured for drop-in PostgreSQL / Supabase integration.
                </p>
              </div>
              <Button size="sm" variant="danger" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" /> Reset Demo Data
              </Button>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                PostgreSQL / Supabase Schema Reference
              </h3>
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <Shield className="h-3.5 w-3.5" /> Enforces 1 Bed = 1 Student &amp; Separate Deposits
              </span>
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {POSTGRES_SCHEMA_PREVIEW}
            </pre>
          </Card>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        open={addStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        title="Add Staff / Manager Account"
        size="md"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Ramesh Hegde"
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            required
          />
          <Input
            label="Email *"
            type="email"
            placeholder="manager@srisaihostel.in"
            value={staffForm.email}
            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            placeholder="+91 98xxx xxxxx"
            value={staffForm.phone}
            onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
          />
          <Select
            label="Role"
            value={staffForm.role}
            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as UserRole })}
          >
            <option value="owner">Owner (Full Access)</option>
            <option value="manager">Property Manager</option>
            <option value="warden">Warden (Rooms &amp; Tenants)</option>
            <option value="accountant">Accountant (Rent &amp; Expenses)</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Users className="h-4 w-4" /> Create Account
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetDemoData}
        title="Reset Demo Data?"
        message="This clears all local edits made in your browser and restores the initial Indian PG dataset (Sri Sai Executive PG)."
        confirmLabel="Restore Defaults"
      />
    </div>
  );
};
