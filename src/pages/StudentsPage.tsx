import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Plus,
  Search,
  Upload,
  UserMinus,
  Users,
} from 'lucide-react';
import { useHostel } from '../services/hostelStore';
import { Gender, IdProofType, Student } from '../types/hostel';
import { formatINR, formatIndianDate, getInitials } from '../utils/formatters';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatusLabel,
} from '../components/ui/Primitives';

const PAGE_SIZE = 7;

export const StudentsPage: React.FC = () => {
  const {
    students,
    rooms,
    buildings,
    rentLedger,
    quickAction,
    consumeQuickAction,
    addStudent,
    updateStudent,
    vacateStudent,
    openStudentProfile,
    notifyToast,
  } = useHostel();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'vacated' | 'pending_payment'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'rent' | 'dues'>('newest');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [vacateTarget, setVacateTarget] = useState<Student | null>(null);
  const [refundAmount, setRefundAmount] = useState('0');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const createEmptyForm = () => ({
    fullName: '',
    photoUrl: '',
    gender: 'Male' as Gender,
    dob: '2002-05-15',
    phone: '',
    email: '',
    organization: '',
    permanentAddress: '',
    parentName: '',
    parentPhone: '',
    emergencyContact: '',
    idProofType: 'Aadhaar Card' as IdProofType,
    idProofNumber: '',
    joiningDate: '2026-11-19',
    monthlyRent: 11000,
    securityDeposit: 20000,
    buildingId: buildings[0]?.id || '',
    floor: 1,
    roomId: '',
    bedId: '',
    notes: '',
  });

  const [form, setForm] = useState(createEmptyForm);

  useEffect(() => {
    if (quickAction === 'add-student') {
      setEditingStudent(null);
      setForm(createEmptyForm());
      setFormErrors({});
      setModalOpen(true);
      consumeQuickAction();
    }
  }, [quickAction]);

  const getPendingBalance = (studentId: string) =>
    rentLedger
      .filter((l) => l.studentId === studentId)
      .reduce((sum, l) => sum + l.balanceAmount, 0);

  const getRoomDisplay = (s: Student) => {
    if (!s.roomId) return 'Unassigned';
    const room = rooms.find((r) => r.id === s.roomId);
    const bed = room?.beds.find((b) => b.id === s.bedId);
    return room ? `Room ${room.roomNumber}${bed ? ` · Bed ${bed.label}` : ''}` : 'Unassigned';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (filter === 'active' && s.status !== 'active') return false;
        if (filter === 'vacated' && s.status !== 'vacated') return false;
        if (filter === 'pending_payment' && getPendingBalance(s.id) <= 0) return false;
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q) ||
          s.organization.toLowerCase().includes(q) ||
          getRoomDisplay(s).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'rent') return b.monthlyRent - a.monthlyRent;
        if (sortBy === 'dues') return getPendingBalance(b.id) - getPendingBalance(a.id);
        return b.joiningDate.localeCompare(a.joiningDate);
      });
  }, [students, search, filter, sortBy, rentLedger, rooms]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openAddModal = () => {
    setEditingStudent(null);
    setForm(createEmptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormErrors({});
    setForm({
      fullName: s.fullName,
      photoUrl: s.photoUrl || '',
      gender: s.gender,
      dob: s.dob,
      phone: s.phone,
      email: s.email,
      organization: s.organization,
      permanentAddress: s.permanentAddress,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      emergencyContact: s.emergencyContact,
      idProofType: s.idProofType,
      idProofNumber: s.idProofNumber,
      joiningDate: s.joiningDate,
      monthlyRent: s.monthlyRent,
      securityDeposit: s.securityDeposit,
      buildingId: s.buildingId || buildings[0]?.id || '',
      floor: s.floor || 1,
      roomId: s.roomId || '',
      bedId: s.bedId || '',
      notes: s.notes,
    });
    setModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const availableRoomsInBuilding = rooms.filter(
    (r) => !form.buildingId || r.buildingId === form.buildingId
  );
  const selectedRoomObj = rooms.find((r) => r.id === form.roomId);
  const vacantBedsInRoom = selectedRoomObj?.beds.filter((b) => b.status === 'vacant') || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Enter a valid 10-digit Indian phone number.';
    }
    if (Number(form.monthlyRent) <= 0) errs.monthlyRent = 'Monthly rent must be greater than ₹0.';
    if (!editingStudent && form.roomId && !form.bedId) {
      errs.bedId = 'Select a vacant bed for the chosen room.';
    }
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    if (editingStudent) {
      updateStudent(editingStudent.id, {
        fullName: form.fullName.trim(),
        photoUrl: form.photoUrl,
        gender: form.gender,
        dob: form.dob,
        phone: form.phone.trim(),
        email: form.email.trim(),
        organization: form.organization.trim(),
        permanentAddress: form.permanentAddress.trim(),
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        emergencyContact: form.emergencyContact.trim(),
        idProofType: form.idProofType,
        idProofNumber: form.idProofNumber.trim(),
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
        notes: form.notes.trim(),
      });
      setModalOpen(false);
    } else {
      const res = addStudent({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
        roomId: form.roomId || null,
        bedId: form.bedId || null,
        buildingId: form.roomId ? form.buildingId || null : null,
        floor: form.roomId ? form.floor || null : null,
      });
      if (!res.ok) {
        notifyToast('error', res.error || 'Could not register tenant.');
        return;
      }
      setModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Tenants"
        title="Students & Tenants"
        subtitle={`${students.filter((s) => s.status === 'active').length} active residents · ${
          students.filter((s) => s.status === 'vacated').length
        } vacated records`}
        actions={
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" /> Register Student
          </Button>
        }
      />

      {/* Search, Filter & Sort Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, phone, room or ID (e.g. PG-2026-001)..."
              className="min-h-[40px] w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl
              value={filter}
              onChange={(v) => {
                setFilter(v as typeof filter);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'pending_payment', label: 'Pending Dues' },
                { value: 'vacated', label: 'Vacated' },
              ]}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort tenants"
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="newest">Sort: Newest</option>
              <option value="name">Sort: Name A–Z</option>
              <option value="rent">Sort: Rent High–Low</option>
              <option value="dues">Sort: Pending Dues</option>
            </select>
          </div>
        </div>
      </Card>

      {paginated.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No matching tenants found"
          description="Clear your search query or filters, or register a new student."
          action={<Button onClick={openAddModal}>Register Student</Button>}
        />
      ) : (
        <Card padding={false} className="overflow-hidden">
          {/* Desktop Data Grid */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Contact &amp; Organization</th>
                  <th className="px-4 py-3.5">Room / Bed</th>
                  <th className="px-4 py-3.5 text-right">Monthly Rent</th>
                  <th className="px-4 py-3.5 text-right">Pending Due</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((stu) => {
                  const due = getPendingBalance(stu.id);
                  return (
                    <tr key={stu.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {stu.photoUrl ? (
                            <img
                              src={stu.photoUrl}
                              alt={stu.fullName}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                              {getInitials(stu.fullName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openStudentProfile(stu.id)}
                              className="truncate font-semibold text-slate-900 hover:text-indigo-600"
                            >
                              {stu.fullName}
                            </button>
                            <p className="text-xs text-slate-500">
                              <span className="font-mono">{stu.studentCode}</span> · Joined{' '}
                              {formatIndianDate(stu.joiningDate)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-mono text-xs text-slate-900 tabular-nums">{stu.phone}</p>
                        <p className="max-w-[210px] truncate text-xs text-slate-500">
                          {stu.organization || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                        {getRoomDisplay(stu)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm font-medium text-slate-900 tabular-nums">
                        {formatINR(stu.monthlyRent)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                        {due > 0 ? (
                          <span className="font-semibold text-rose-600">{formatINR(due)}</span>
                        ) : (
                          <span className="font-sans text-xs font-medium text-emerald-700">
                            Clear
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusLabel tone={stu.status === 'active' ? 'emerald' : 'slate'}>
                          {stu.status}
                        </StatusLabel>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openStudentProfile(stu.id)}
                            title="View Profile"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(stu)}
                            title="Edit Student"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {stu.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setVacateTarget(stu);
                                setRefundAmount(String(stu.securityDeposit));
                              }}
                              title="Vacate Student"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="divide-y divide-slate-100 md:hidden">
            {paginated.map((stu) => {
              const due = getPendingBalance(stu.id);
              return (
                <div key={stu.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                        {getInitials(stu.fullName)}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openStudentProfile(stu.id)}
                          className="font-semibold text-slate-900"
                        >
                          {stu.fullName}
                        </button>
                        <p className="text-xs text-slate-500">
                          {stu.phone} · {stu.studentCode}
                        </p>
                      </div>
                    </div>
                    <StatusLabel tone={stu.status === 'active' ? 'emerald' : 'slate'}>
                      {stu.status}
                    </StatusLabel>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{getRoomDisplay(stu)}</span>
                    <span className="font-mono tabular-nums">Rent {formatINR(stu.monthlyRent)}</span>
                    <span
                      className={
                        due > 0
                          ? 'font-mono font-semibold text-rose-600 tabular-nums'
                          : 'font-medium text-emerald-700'
                      }
                    >
                      {due > 0 ? `Due ${formatINR(due)}` : 'Dues Clear'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => openStudentProfile(stu.id)}
                    >
                      View Profile
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(stu)}>
                      Edit
                    </Button>
                    {stu.status === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setVacateTarget(stu);
                          setRefundAmount(String(stu.securityDeposit));
                        }}
                      >
                        Vacate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            <span className="tabular-nums">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-mono font-medium text-slate-700 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Register / Edit Student Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingStudent ? `Edit Tenant — ${editingStudent.fullName}` : 'New Student Registration'
        }
        subtitle="Personal info, guardian contact, KYC identifier, rent terms, and bed allocation"
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Profile Photo Picker */}
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-4">
            {form.photoUrl ? (
              <img
                src={form.photoUrl}
                alt="Tenant preview"
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                {form.fullName ? getInitials(form.fullName) : 'ST'}
              </div>
            )}
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> Upload Profile Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">Optional passport-size JPG or PNG</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Full Name *"
              value={form.fullName}
              error={formErrors.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
            <Input
              label="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Phone Number *"
              placeholder="+91 98xxx xxxxx"
              value={form.phone}
              error={formErrors.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="College / Company"
              placeholder="Christ University / Infosys"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Parent / Guardian Name"
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
            />
            <Input
              label="Parent Contact Number"
              placeholder="+91 98xxx xxxxx"
              value={form.parentPhone}
              onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
            />
            <Input
              label="Emergency Contact"
              placeholder="+91 98xxx xxxxx"
              value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            />
          </div>

          <Input
            label="Permanent Address"
            placeholder="House no, Street, City, State, PIN"
            value={form.permanentAddress}
            onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="ID Proof Type"
              value={form.idProofType}
              onChange={(e) => setForm({ ...form, idProofType: e.target.value as IdProofType })}
            >
              <option value="Aadhaar Card">Aadhaar Card</option>
              <option value="PAN Card">PAN Card</option>
              <option value="Passport">Passport</option>
              <option value="Driving License">Driving License</option>
              <option value="College/Company ID">College/Company ID</option>
            </Select>
            <Input
              label="ID Document Reference"
              placeholder="Masked Aadhaar / PAN / DL"
              value={form.idProofNumber}
              onChange={(e) => setForm({ ...form, idProofNumber: e.target.value })}
            />
            <Input
              label="Joining Date"
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <Input
              label="Monthly Rent (₹) *"
              type="number"
              min={1000}
              value={form.monthlyRent}
              error={formErrors.monthlyRent}
              onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) })}
            />
            <Input
              label="Security Deposit (₹)"
              type="number"
              min={0}
              value={form.securityDeposit}
              onChange={(e) => setForm({ ...form, securityDeposit: Number(e.target.value) })}
            />
          </div>

          {!editingStudent && (
            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <Select
                label="Building"
                value={form.buildingId}
                onChange={(e) =>
                  setForm({ ...form, buildingId: e.target.value, roomId: '', bedId: '' })
                }
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Room (Optional)"
                value={form.roomId}
                onChange={(e) => {
                  const rm = rooms.find((r) => r.id === e.target.value);
                  setForm({
                    ...form,
                    roomId: e.target.value,
                    bedId: '',
                    floor: rm?.floor || 1,
                    monthlyRent: rm?.defaultRent || form.monthlyRent,
                  });
                }}
              >
                <option value="">Assign later</option>
                {availableRoomsInBuilding.map((r) => {
                  const vacantCount = r.beds.filter((b) => b.status === 'vacant').length;
                  return (
                    <option key={r.id} value={r.id} disabled={vacantCount === 0}>
                      Room {r.roomNumber} · Floor {r.floor} ({r.type}) — {vacantCount} vacant
                    </option>
                  );
                })}
              </Select>

              <Select
                label="Bed"
                value={form.bedId}
                error={formErrors.bedId}
                disabled={!form.roomId}
                onChange={(e) => setForm({ ...form, bedId: e.target.value })}
              >
                <option value="">Select vacant bed</option>
                {vacantBedsInRoom.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bed {b.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Input
            label="Additional Notes"
            placeholder="Meal preferences, two-wheeler parking, shift timings..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingStudent ? 'Save Changes' : 'Register Tenant'}</Button>
          </div>
        </form>
      </Modal>

      {/* Vacate Confirmation Modal */}
      <Modal
        open={Boolean(vacateTarget)}
        onClose={() => setVacateTarget(null)}
        title={vacateTarget ? `Vacate ${vacateTarget.fullName}` : ''}
        subtitle="Vacating releases the assigned bed immediately and settles the security deposit."
        size="md"
      >
        {vacateTarget && (
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-lg bg-slate-50 p-3.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Current Allocation</span>
                <span className="font-semibold text-slate-900">{getRoomDisplay(vacateTarget)}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Deposit Held</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatINR(vacateTarget.securityDeposit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Rent Dues</span>
                <span className="font-mono font-semibold text-rose-600 tabular-nums">
                  {formatINR(getPendingBalance(vacateTarget.id))}
                </span>
              </div>
            </div>

            <Input
              label="Security Deposit Refund Amount (₹)"
              type="number"
              min={0}
              max={vacateTarget.securityDeposit}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="secondary" onClick={() => setVacateTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  vacateStudent(
                    vacateTarget.id,
                    new Date().toISOString().slice(0, 10),
                    Number(refundAmount) || 0
                  );
                  setVacateTarget(null);
                }}
              >
                Confirm Vacate &amp; Release Bed
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
