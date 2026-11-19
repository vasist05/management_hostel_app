import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  BedDouble,
  Building2,
  Edit3,
  Plus,
  Trash2,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { countOccupiedBeds } from '../logic/businessRules';
import { useHostel } from '../services/hostelStore';
import { Bed, Room, RoomType } from '../types/hostel';
import { formatINR } from '../utils/formatters';
import {
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatusLabel,
} from '../components/ui/Primitives';

export const RoomsBedsPage: React.FC = () => {
  const {
    buildings,
    rooms,
    students,
    quickAction,
    consumeQuickAction,
    addBuilding,
    addRoom,
    updateRoom,
    deleteRoom,
    assignOrTransferBed,
    vacateBedOnly,
    openStudentProfile,
    notifyToast,
  } = useHostel();

  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'vacant' | 'full'>('all');
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [detailRoomId, setDetailRoomId] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ room: Room; bed: Bed } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null);
  const [vacateBedTarget, setVacateBedTarget] = useState<{
    room: Room;
    bed: Bed;
    occupantName: string;
  } | null>(null);

  const [roomForm, setRoomForm] = useState({
    buildingId: buildings[0]?.id || '',
    floor: 1,
    roomNumber: '',
    type: 'Double' as RoomType,
    capacity: 2,
    defaultRent: 11000,
    amenities: 'AC, Wi-Fi, Attached Bath',
  });

  const [buildingForm, setBuildingForm] = useState({
    name: '',
    code: '',
    address: '',
    totalFloors: 3,
  });

  useEffect(() => {
    if (quickAction === 'add-room') {
      setEditingRoom(null);
      setAddRoomOpen(true);
      consumeQuickAction();
    }
  }, [quickAction]);

  const filteredRooms = rooms.filter((r) => {
    if (selectedBuilding !== 'all' && r.buildingId !== selectedBuilding) return false;
    const occ = countOccupiedBeds(r);
    if (availabilityFilter === 'vacant' && occ >= r.capacity) return false;
    if (availabilityFilter === 'full' && occ < r.capacity) return false;
    return true;
  });

  const totalBeds = rooms.reduce((s, r) => s + r.beds.length, 0);
  const occupiedBeds = rooms.reduce((s, r) => s + countOccupiedBeds(r), 0);
  const assignableStudents = students.filter((s) => s.status === 'active');
  const detailRoom = rooms.find((r) => r.id === detailRoomId) || null;

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({
      buildingId: buildings[0]?.id || '',
      floor: 1,
      roomNumber: '',
      type: 'Double',
      capacity: 2,
      defaultRent: 11000,
      amenities: 'AC, Wi-Fi, Attached Bath',
    });
    setAddRoomOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      buildingId: room.buildingId,
      floor: room.floor,
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      defaultRent: room.defaultRent,
      amenities: room.amenities.join(', '),
    });
    setAddRoomOpen(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const amenitiesList = roomForm.amenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (editingRoom) {
      updateRoom(editingRoom.id, {
        roomNumber: roomForm.roomNumber.trim(),
        floor: Number(roomForm.floor),
        type: roomForm.type,
        defaultRent: Number(roomForm.defaultRent),
        amenities: amenitiesList,
      });
      setAddRoomOpen(false);
      return;
    }

    const res = addRoom({
      buildingId: roomForm.buildingId,
      floor: Number(roomForm.floor),
      roomNumber: roomForm.roomNumber.trim(),
      type: roomForm.type,
      capacity: Number(roomForm.capacity),
      defaultRent: Number(roomForm.defaultRent),
      amenities: amenitiesList,
    });
    if (!res.ok) {
      notifyToast('error', res.error || 'Unable to add room.');
      return;
    }
    setAddRoomOpen(false);
  };

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingForm.name.trim() || !buildingForm.code.trim()) return;
    addBuilding({
      ...buildingForm,
      name: buildingForm.name.trim(),
      code: buildingForm.code.trim().toUpperCase(),
      totalFloors: Number(buildingForm.totalFloors),
    });
    setAddBuildingOpen(false);
    setBuildingForm({ name: '', code: '', address: '', totalFloors: 3 });
  };

  const handleAssignBed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal || !selectedStudentId) return;
    const stu = students.find((s) => s.id === selectedStudentId);
    const res = assignOrTransferBed(
      selectedStudentId,
      assignModal.room.id,
      assignModal.bed.id,
      Boolean(stu?.bedId)
    );
    if (res.ok) {
      setAssignModal(null);
      setSelectedStudentId('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Property & Capacity"
        title="Rooms & Bed Occupancy Map"
        subtitle={`${occupiedBeds} of ${totalBeds} beds occupied · ${totalBeds - occupiedBeds} vacant across ${buildings.length} buildings`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setAddBuildingOpen(true)}>
              <Building2 className="h-4 w-4" /> Add Building
            </Button>
            <Button size="sm" onClick={openAddRoom}>
              <Plus className="h-4 w-4" /> Add Room
            </Button>
          </>
        }
      />

      {/* Building Filter, Availability Filter & Visual Legend */}
      <Card className="p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              aria-label="Filter by building"
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="all">All Buildings ({buildings.length})</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <SegmentedControl
              value={availabilityFilter}
              onChange={(v) => setAvailabilityFilter(v as typeof availabilityFilter)}
              options={[
                { value: 'all', label: 'All Rooms' },
                { value: 'vacant', label: 'Has Vacant Beds' },
                { value: 'full', label: 'Full Rooms' },
              ]}
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-3 w-3 rounded-xs border border-emerald-400 bg-emerald-100" />
              Vacant Bed
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="h-3 w-3 rounded-xs border border-rose-400 bg-rose-100" />
              Occupied Bed
            </span>
          </div>
        </div>
      </Card>

      {filteredRooms.length === 0 ? (
        <EmptyState
          icon={<BedDouble className="h-6 w-6" />}
          title="No rooms match this filter"
          description="Switch buildings or availability filters, or add a new room."
          action={<Button onClick={openAddRoom}>Add Room</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const building = buildings.find((b) => b.id === room.buildingId);
            const occupied = countOccupiedBeds(room);
            const isFull = occupied >= room.capacity;
            return (
              <Card key={room.id} className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Room {room.roomNumber}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {building?.code} · Floor {room.floor} · {room.type} ·{' '}
                        <span className="font-mono text-slate-700 tabular-nums">
                          {formatINR(room.defaultRent)}/bed
                        </span>
                      </p>
                    </div>
                    <StatusLabel tone={isFull ? 'rose' : 'emerald'}>
                      {occupied}/{room.capacity} Occupied
                    </StatusLabel>
                  </div>

                  {/* Bed Visual Map */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {room.beds.map((bed) => {
                      const occupant = students.find((s) => s.id === bed.occupantStudentId);
                      const isOcc = bed.status === 'occupied' && Boolean(occupant);
                      return (
                        <div
                          key={bed.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            isOcc
                              ? 'border-rose-200 bg-rose-50/75'
                              : 'border-emerald-200 bg-emerald-50/75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <BedDouble
                                className={`h-3.5 w-3.5 ${
                                  isOcc ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              />
                              Bed {bed.label}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${
                                isOcc ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {isOcc ? 'Occupied' : 'Vacant'}
                            </span>
                          </div>

                          {isOcc && occupant ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => openStudentProfile(occupant.id)}
                                className="block w-full truncate text-left text-xs font-semibold text-slate-900 hover:text-indigo-600"
                              >
                                {occupant.fullName}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setVacateBedTarget({
                                    room,
                                    bed,
                                    occupantName: occupant.fullName,
                                  })
                                }
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:underline"
                              >
                                <UserMinus className="h-3 w-3" /> Vacate Bed
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAssignModal({ room, bed })}
                              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Assign Tenant
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="truncate text-slate-500">
                    {room.amenities.join(' · ') || 'Standard room'}
                  </span>
                  <div className="ml-2 flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailRoomId(room.id)}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditRoom(room)}
                      title="Edit Room"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteRoomTarget(room)}
                      title="Delete Room"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Room Detail Slide-over Drawer */}
      <Drawer
        open={Boolean(detailRoom)}
        onClose={() => setDetailRoomId(null)}
        title={detailRoom ? `Room ${detailRoom.roomNumber} Details` : ''}
        subtitle={
          detailRoom
            ? `${buildings.find((b) => b.id === detailRoom.buildingId)?.name} · Floor ${
                detailRoom.floor
              } · ${detailRoom.type}`
            : ''
        }
      >
        {detailRoom && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Rent / Bed</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {formatINR(detailRoom.defaultRent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Capacity</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {countOccupiedBeds(detailRoom)} / {detailRoom.capacity}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Room Type</p>
                <p className="mt-0.5 font-semibold text-slate-900">{detailRoom.type}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Amenities</p>
              <p className="text-sm text-slate-800">
                {detailRoom.amenities.join(' · ') || 'Standard fixtures'}
              </p>
            </div>

            <div>
              <p className="mb-2.5 text-xs font-semibold text-slate-700">Bed Allocation Status</p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {detailRoom.beds.map((b) => {
                  const stu = students.find((s) => s.id === b.occupantStudentId);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Bed {b.label}</p>
                        {stu ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailRoomId(null);
                              openStudentProfile(stu.id);
                            }}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                          >
                            {stu.fullName} · {stu.phone}
                          </button>
                        ) : (
                          <p className="text-xs text-emerald-700">Vacant and ready</p>
                        )}
                      </div>
                      {stu ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setVacateBedTarget({
                              room: detailRoom,
                              bed: b,
                              occupantName: stu.fullName,
                            })
                          }
                        >
                          Vacate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setAssignModal({ room: detailRoom, bed: b })}
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add / Edit Room Modal */}
      <Modal
        open={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.roomNumber}` : 'Add New Room'}
        size="md"
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {!editingRoom && (
            <Select
              label="Building"
              value={roomForm.buildingId}
              onChange={(e) => setRoomForm({ ...roomForm, buildingId: e.target.value })}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room Number *"
              placeholder="e.g. 302"
              value={roomForm.roomNumber}
              onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
              required
            />
            <Input
              label="Floor"
              type="number"
              min={0}
              value={roomForm.floor}
              onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Room Type"
              value={roomForm.type}
              onChange={(e) => {
                const t = e.target.value as RoomType;
                const capMap: Record<RoomType, number> = {
                  Single: 1,
                  Double: 2,
                  Triple: 3,
                  'Four-sharing': 4,
                  Custom: roomForm.capacity,
                };
                setRoomForm({
                  ...roomForm,
                  type: t,
                  capacity: editingRoom ? roomForm.capacity : capMap[t],
                });
              }}
            >
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Triple">Triple</option>
              <option value="Four-sharing">Four-sharing</option>
              <option value="Custom">Custom</option>
            </Select>
            <Input
              label="Bed Capacity"
              type="number"
              min={1}
              max={10}
              disabled={Boolean(editingRoom)}
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Monthly Rent per Bed (₹)"
            type="number"
            min={1000}
            value={roomForm.defaultRent}
            onChange={(e) => setRoomForm({ ...roomForm, defaultRent: Number(e.target.value) })}
          />
          <Input
            label="Amenities (comma separated)"
            value={roomForm.amenities}
            onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddRoomOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingRoom ? 'Save Room' : 'Create Room'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add Building Modal */}
      <Modal
        open={addBuildingOpen}
        onClose={() => setAddBuildingOpen(false)}
        title="Add Property / Building"
        size="md"
      >
        <form onSubmit={handleCreateBuilding} className="space-y-4">
          <Input
            label="Building Name *"
            placeholder="Block C — South Wing"
            value={buildingForm.name}
            onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Short Code *"
              placeholder="BLK-C"
              value={buildingForm.code}
              onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })}
              required
            />
            <Input
              label="Total Floors"
              type="number"
              min={1}
              value={buildingForm.totalFloors}
              onChange={(e) =>
                setBuildingForm({ ...buildingForm, totalFloors: Number(e.target.value) })
              }
            />
          </div>
          <Input
            label="Address"
            value={buildingForm.address}
            onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddBuildingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Building</Button>
          </div>
        </form>
      </Modal>

      {/* Assign / Transfer Student Modal */}
      <Modal
        open={Boolean(assignModal)}
        onClose={() => setAssignModal(null)}
        title={
          assignModal
            ? `Assign Room ${assignModal.room.roomNumber} · Bed ${assignModal.bed.label}`
            : ''
        }
        subtitle="If the tenant already has an active bed, this safely transfers them and releases their old bed."
        size="md"
      >
        <form onSubmit={handleAssignBed} className="space-y-4">
          <Select
            label="Select Active Student"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            required
          >
            <option value="">Choose tenant...</option>
            {assignableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentCode}){' '}
                {s.roomId ? '— Transfer from current bed' : '— Unassigned'}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignModal(null)}>
              Cancel
            </Button>
            <Button type="submit">
              <ArrowRightLeft className="h-4 w-4" /> Confirm Allocation
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRoomTarget)}
        onClose={() => setDeleteRoomTarget(null)}
        onConfirm={() => {
          if (deleteRoomTarget) deleteRoom(deleteRoomTarget.id);
        }}
        title={`Delete Room ${deleteRoomTarget?.roomNumber || ''}?`}
        message="Rooms with occupied beds are protected from deletion. Empty rooms will be removed permanently."
        confirmLabel="Delete Room"
      />

      <ConfirmDialog
        open={Boolean(vacateBedTarget)}
        onClose={() => setVacateBedTarget(null)}
        onConfirm={() => {
          if (vacateBedTarget) {
            vacateBedOnly(vacateBedTarget.room.id, vacateBedTarget.bed.id);
          }
        }}
        title={`Vacate Bed ${vacateBedTarget?.bed.label || ''}?`}
        message={`This will mark ${vacateBedTarget?.occupantName || 'this tenant'} as vacated and immediately release Room ${
          vacateBedTarget?.room.roomNumber || ''
        }, Bed ${vacateBedTarget?.bed.label || ''}.`}
        confirmLabel="Vacate Bed"
      />
    </div>
  );
};
