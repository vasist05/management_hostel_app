import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useHostel } from '../services/hostelStore';
import { StudentDocument, VerificationStatus } from '../types/hostel';
import { formatIndianDate } from '../utils/formatters';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatCard,
  StatusLabel,
} from '../components/ui/Primitives';

const DOC_TYPES: StudentDocument['docType'][] = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'College/Company ID',
  'Police Verification',
  'Agreement',
];

export const DocumentsPage: React.FC = () => {
  const {
    students,
    documents,
    addDocument,
    updateDocumentStatus,
    deleteDocument,
    openStudentProfile,
    notifyToast,
  } = useHostel();

  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentDocument | null>(null);

  const [form, setForm] = useState({
    studentId: students[0]?.id || '',
    docType: 'Aadhaar Card' as StudentDocument['docType'],
    fileName: '',
    fileSize: '720 KB',
    referenceNo: '',
    remarks: '',
  });

  const getStudent = (id: string) => students.find((s) => s.id === id);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!q) return true;
      const stu = getStudent(d.studentId);
      return (
        stu?.fullName.toLowerCase().includes(q) ||
        d.docType.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.referenceNo.toLowerCase().includes(q)
      );
    });
  }, [documents, statusFilter, search, students]);

  const activeStudentsMissingVerifiedKyc = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;
      const hasVerified = documents.some(
        (d) => d.studentId === s.id && d.status === 'verified'
      );
      return !hasVerified;
    });
  }, [students, documents]);

  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const pendingCount = documents.filter((d) => d.status === 'pending').length;

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.fileName.trim()) {
      notifyToast('error', 'Select a student and attach a document file.');
      return;
    }
    addDocument({
      studentId: form.studentId,
      docType: form.docType,
      fileName: form.fileName.trim(),
      fileSize: form.fileSize,
      referenceNo: form.referenceNo.trim() || 'PENDING-REF',
      remarks: form.remarks.trim() || undefined,
    });
    setUploadOpen(false);
    setForm({ ...form, fileName: '', referenceNo: '', remarks: '' });
  };

  const simulateDownload = (doc: StudentDocument) => {
    const stu = getStudent(doc.studentId);
    const content = [
      'HOSTEL MANAGER V4.1 — KYC DOCUMENT RECORD (DEMO)',
      `Student: ${stu?.fullName || doc.studentId} (${stu?.studentCode || ''})`,
      `Document Type: ${doc.docType}`,
      `File Name: ${doc.fileName}`,
      `Reference No: ${doc.referenceNo}`,
      `Verification Status: ${doc.status.toUpperCase()}`,
      `Uploaded On: ${doc.uploadedOn}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notifyToast('info', `Downloaded KYC record copy for ${doc.fileName}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Compliance & KYC"
        title="Documents & KYC Vault"
        subtitle="Manage tenant identity proofs, police verification forms, and rental agreements."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload Document
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Verified KYC Files"
          value={verifiedCount}
          hint="Approved by management"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          hint="Awaiting original check"
          icon={<Clock className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Tenants Missing Verified KYC"
          value={activeStudentsMissingVerifiedKyc.length}
          hint="Active residents needing follow-up"
          icon={<ShieldAlert className="h-4 w-4" />}
          tone={activeStudentsMissingVerifiedKyc.length > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Missing KYC Notice Strip */}
      {activeStudentsMissingVerifiedKyc.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Action Needed: Active tenants without verified KYC
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {activeStudentsMissingVerifiedKyc.map((s) => s.fullName).join(' · ')}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
              Upload Missing KYC
            </Button>
          </div>
        </Card>
      )}

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, document type, reference..."
              className="min-h-[40px] w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <SegmentedControl
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: `Pending (${pendingCount})` },
              { value: 'verified', label: 'Verified' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </div>
      </Card>

      {/* Documents Table */}
      <Card padding={false} className="overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No documents found"
              description="Upload an identity document or clear your filters."
              action={<Button onClick={() => setUploadOpen(true)}>Upload Document</Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Document &amp; File</th>
                  <th className="px-4 py-3.5">Reference No</th>
                  <th className="px-4 py-3.5">Uploaded</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const stu = getStudent(doc.studentId);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => openStudentProfile(doc.studentId)}
                          className="font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {stu?.fullName || 'Unknown'}
                        </button>
                        <p className="font-mono text-xs text-slate-500">{stu?.studentCode}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{doc.docType}</p>
                        <p className="text-xs text-slate-500">
                          {doc.fileName} {doc.fileSize ? `· ${doc.fileSize}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700">
                        {doc.referenceNo}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {formatIndianDate(doc.uploadedOn)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusLabel
                          tone={
                            doc.status === 'verified'
                              ? 'emerald'
                              : doc.status === 'pending'
                              ? 'amber'
                              : 'rose'
                          }
                        >
                          {doc.status}
                        </StatusLabel>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            title="Inspect Document"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => simulateDownload(doc)}
                            title="Download Copy"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {doc.status !== 'verified' && (
                            <button
                              type="button"
                              onClick={() => updateDocumentStatus(doc.id, 'verified', 'Original verified')}
                              title="Verify Document"
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {doc.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDocumentStatus(doc.id, 'rejected', 'Unclear scan — re-upload required')
                              }
                              title="Reject Document"
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            title="Remove Document"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upload Document Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Student KYC Document" size="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <Select
            label="Student *"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            required
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentCode})
              </option>
            ))}
          </Select>

          <Select
            label="Document Type"
            value={form.docType}
            onChange={(e) =>
              setForm({ ...form, docType: e.target.value as StudentDocument['docType'] })
            }
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <Input
            label="Document Reference Number"
            placeholder="Masked Aadhaar / PAN / Passport No."
            value={form.referenceNo}
            onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Select File (PDF, JPG, PNG) *
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> Choose File
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setForm({
                        ...form,
                        fileName: f.name,
                        fileSize: `${Math.max(1, Math.round(f.size / 1024))} KB`,
                      });
                    }
                  }}
                />
              </label>
              <span className="truncate text-xs text-slate-600">
                {form.fileName || 'No file selected'}
              </span>
            </div>
          </div>

          <Input
            label="Verification Remarks (Optional)"
            placeholder="e.g. Original checked at admission desk"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Upload &amp; Save</Button>
          </div>
        </form>
      </Modal>

      {/* Secure Document Preview Modal */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `${previewDoc.docType} — ${previewDoc.fileName}` : ''}
        subtitle="Encrypted document metadata preview (Demo Storage Mode)"
        size="md"
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <FileText className="mx-auto h-10 w-10 text-indigo-600" />
              <p className="mt-2 font-semibold text-slate-900">{previewDoc.fileName}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                Ref: {previewDoc.referenceNo} · {previewDoc.fileSize || 'PDF/Image'}
              </p>
              <div className="mt-3">
                <StatusLabel
                  tone={
                    previewDoc.status === 'verified'
                      ? 'emerald'
                      : previewDoc.status === 'pending'
                      ? 'amber'
                      : 'rose'
                  }
                >
                  {previewDoc.status}
                </StatusLabel>
              </div>
              {previewDoc.remarks && (
                <p className="mt-3 text-xs text-slate-600">Remarks: {previewDoc.remarks}</p>
              )}
              {previewDoc.verifiedBy && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Reviewed by {previewDoc.verifiedBy}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => simulateDownload(previewDoc)}>
                <Download className="h-4 w-4" /> Download
              </Button>
              {previewDoc.status !== 'verified' && (
                <Button
                  variant="success"
                  onClick={() => {
                    updateDocumentStatus(previewDoc.id, 'verified', 'Approved via viewer');
                    setPreviewDoc(null);
                  }}
                >
                  Approve &amp; Verify
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteDocument(deleteTarget.id);
        }}
        title="Remove Document?"
        message={`Delete ${deleteTarget?.docType} (${deleteTarget?.fileName}) from the KYC vault?`}
        confirmLabel="Remove"
      />
    </div>
  );
};
