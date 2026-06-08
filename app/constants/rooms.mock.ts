// app/constants/rooms.mock.ts
import type { Room } from '~/types/room'

export const mockRooms: Room[] = [
  {
    id: '1',
    code: 'R-001',
    name: 'Poli Umum 1',
    type: 'POLI',
    floor: 'Lantai 1',
    capacity: 2,
    pic: 'Dr. Rina Sari',
    facilities: 'Bed, tensimeter, stetoskop',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: [
      {
        id: 'p1',
        name: 'Budi Santoso',
        queueNo: 'A-017',
        complaint: 'Demam & batuk',
        guarantor: 'BPJS',
        enteredAt: '09.30',
        status: 'IN_PROGRESS'
      }
    ]
  },
  {
    id: '2',
    code: 'R-002',
    name: 'Poli Umum 2',
    type: 'POLI',
    floor: 'Lantai 1',
    capacity: 2,
    pic: 'Dr. Hendra',
    facilities: 'Bed, tensimeter, stetoskop',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: [
      {
        id: 'p2',
        name: 'Siti Rahayu',
        queueNo: 'A-018',
        complaint: 'Sakit kepala',
        guarantor: 'Umum',
        enteredAt: '09.35',
        status: 'IN_PROGRESS'
      },
      {
        id: 'p3',
        name: 'Ahmad Fauzi',
        queueNo: 'A-019',
        complaint: 'Kontrol rutin',
        guarantor: 'BPJS',
        enteredAt: '09.40',
        status: 'WAITING'
      }
    ]
  },
  {
    id: '3',
    code: 'R-003',
    name: 'Ruang Tindakan',
    type: 'TINDAKAN',
    floor: 'Lantai 1',
    capacity: 3,
    pic: 'Ns. Dewi',
    facilities: 'Bed tindakan, lampu sorot',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: [
      {
        id: 'p4',
        name: 'Dewi Lestari',
        queueNo: 'B-004',
        complaint: 'Jahit luka',
        guarantor: 'Asuransi',
        enteredAt: '09.15',
        status: 'IN_PROGRESS'
      }
    ]
  },
  {
    id: '4',
    code: 'R-004',
    name: 'Laboratorium',
    type: 'LABORATORIUM',
    floor: 'Lantai 1',
    capacity: 2,
    pic: 'Analis Budi',
    facilities: 'Mikroskop, hematology analyzer',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: [
      {
        id: 'p5',
        name: 'Rudi Pratama',
        queueNo: 'C-012',
        complaint: 'Cek darah lengkap',
        guarantor: 'BPJS',
        enteredAt: '09.20',
        status: 'DONE'
      },
      {
        id: 'p6',
        name: 'Nina Kusuma',
        queueNo: 'C-013',
        complaint: 'Gula darah puasa',
        guarantor: 'Umum',
        enteredAt: '09.45',
        status: 'IN_PROGRESS'
      }
    ]
  },
  {
    id: '5',
    code: 'R-005',
    name: 'Apotek / Farmasi',
    type: 'FARMASI',
    floor: 'Lantai 1',
    capacity: 1,
    pic: 'Apt. Sari',
    facilities: 'Rak obat, kulkas vaksin',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: []
  },
  {
    id: '6',
    code: 'R-006',
    name: 'Ruang KIA',
    type: 'POLI',
    floor: 'Lantai 1',
    capacity: 2,
    pic: 'Bidan Rini',
    facilities: 'Bed gynekologi, USG',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: []
  },
  {
    id: '7',
    code: 'R-007',
    name: 'Kasir & Administrasi',
    type: 'ADMINISTRASI',
    floor: 'Lobby',
    capacity: 3,
    pic: 'Admin Tuti',
    facilities: 'Komputer, printer, mesin EDC',
    description: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: []
  },
  {
    id: '8',
    code: 'R-008',
    name: 'Ruang Sterilisasi',
    type: 'LAINNYA',
    floor: 'Lantai 1',
    capacity: 1,
    pic: '',
    facilities: 'Autoclave, UV sterilizer',
    description: 'Sedang perbaikan',
    status: 'INACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patients: []
  }
]
