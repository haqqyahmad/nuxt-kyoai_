export type OutpatientEncounterStatus = 'WAITING' | 'IN_CONSULTATION' | 'DONE' | 'CANCELLED'
export type PrescriptionItemStatus = 'ORDERED' | 'PROCESSING' | 'READY' | 'DISPENSED' | 'CANCELLED'
export type PrescriptionItemKind = 'UNIT' | 'COMPOUND'
export type PrescriptionTiming = 'BEFORE_MEAL' | 'AFTER_MEAL' | 'EMPTY_STOMACH' | 'BEDTIME' | 'AS_NEEDED'

export type OutpatientPatient = {
  id: string
  patientCode: string
  fullName: string
  gender: string
  dob: string
  phone?: string | null
  idNumber?: string | null
  allergyNotes?: string | null
  diseaseNotes?: string | null
}

export type OutpatientRegistration = {
  id: number
  id_reg: string
  serviceType: string
  paymentType: string
  companyId: string
  statusRegistration: string
}

export type OutpatientEncounter = {
  id: string
  registrationId: number
  patientId: string
  branchId: string
  queueDate: string
  queueNumber: number
  queueCode: string
  status: OutpatientEncounterStatus
  priority: string
  doctorId: number | null
  nurseId: number | null
  chiefComplaint: string | null
  queuedAt: string
  calledAt: string | null
  startedAt: string | null
  doneAt: string | null
  patient?: OutpatientPatient | null
  registration?: OutpatientRegistration | null
}

export type VitalSign = {
  id: string
  encounterId: string
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  respiratoryRate: number | null
  temperature: number | null
  spo2: number | null
  weightKg: number | null
  heightCm: number | null
  bmi: number | null
  bloodSugar: number | null
  painScale: number | null
  notes: string | null
  recordedAt: string
}

export type SoapNote = {
  id: string
  encounterId: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  followUpDate: string | null
  referralTo: string | null
  referralNote: string | null
  status: string
  submittedAt: string | null
}

export type Diagnosis = {
  id: string
  encounterId: string
  icd10Code: string
  icd10Description: string
  notes: string | null
}

export type PrescriptionItem = {
  id: string
  prescriptionId: string
  kind: PrescriptionItemKind
  medicineId: string | null
  medicineName: string
  compoundName: string | null
  compoundComponents: Array<{ medicineId?: string | null, name: string, quantity: number, uom?: string | null }> | null
  dose: string | null
  frequency: string | null
  route: string | null
  method: string | null
  timing: string | null
  asNeededFor: string | null
  durationDays: number | null
  uom: string | null
  quantity: number | null
  baseQuantity: number | null
  instructions: string | null
  status: PrescriptionItemStatus
  warehouseId?: string | null
  sortOrder: number
  unitPrice?: number | null
  lineTotal?: number | null
}

export type Prescription = {
  id: string
  encounterId: string
  registrationId: number
  patientId: string
  orderNo: number
  isAdditional: boolean
  warehouseId: string | null
  status: string
  notes: string | null
  sentAt: string | null
  createdAt: string
  items: PrescriptionItem[]
}

export type PharmacyEncounterDetail = {
  encounter: OutpatientEncounter
  orders: Prescription[]
}

export type EncounterDetail = OutpatientEncounter & {
  vitals: VitalSign | null
  soap: SoapNote | null
  diagnoses: Diagnosis[]
  prescriptions: Prescription[]
}

export type MedicineUnit = {
  id?: string
  uom: string
  conversionFactor: number
  isBase?: boolean
  isPurchase?: boolean
  isDispense?: boolean
  sortOrder?: number
}

export type Medicine = {
  id: string
  code: string
  name: string
  form: string
  strength: string | null
  baseUnit: string
  category: string | null
  manufacturer: string | null
  hpp?: number
  markupPercent?: number
  isSellable: boolean
  isStocked: boolean
  isCompoundIngredient: boolean
  isActive: boolean
  notes: string | null
  units: MedicineUnit[]
}

export type Warehouse = {
  id: string
  branchId: string
  code: string
  name: string
  type: string
  isDefault: boolean
  isActive: boolean
  notes: string | null
}

export type PriceTier = {
  id: string
  code: string
  label: string
  type: string
  percent: number
  customerCode: string | null
  country: string | null
  sortOrder: number
  isActive: boolean
}

export type StockRow = {
  id: string
  warehouseId: string
  medicineId: string
  quantity: number
  minStock: number
  medicine: Medicine | null
}

export type StockRequestItem = {
  id: string
  medicineId: string
  uom: string | null
  quantity: number
  baseQuantity: number
}

export type StockRequest = {
  id: string
  type: string
  status: string
  fromWarehouseId: string | null
  toWarehouseId: string | null
  reason: string | null
  requestedAt: string
  reviewedAt: string | null
  reviewNote: string | null
  items: StockRequestItem[]
}

export type StockMovement = {
  id: string
  warehouseId: string
  medicineId: string
  type: string
  quantity: number
  beforeQty: number
  afterQty: number
  uom: string | null
  reason: string | null
  refType: string | null
  refId: string | null
  actorId: number | null
  createdAt: string
}

export type Icd10 = {
  id: number
  code: string
  descriptionEng: string
  descriptionInd: string | null
}

export type PrescriptionOptionType = 'DOSE' | 'FREQUENCY' | 'TIMING' | 'ROUTE' | 'METHOD' | 'AS_NEEDED_REASON'

export type PrescriptionOption = {
  id: string
  type: PrescriptionOptionType
  value: string
  labelEng: string
  labelInd: string | null
  sortOrder: number
  isActive: boolean
}

export type MedicineStockItem = {
  id: string
  code: string
  name: string
  strength?: string | null
  form?: string | null
  baseUnit: string
  units: Array<{ uom: string, conversionFactor: number, isBase?: boolean, isDispense?: boolean }>
  stock: number
}

export type OutpatientExamItem = {
  trxExamItemId: string
  itemId: string
  source: string
  code: string | null
  name: string | null
  department: string | null
  departmentCode: string | null
  roomType: string | null
  roomTypeCode: string | null
  status: string | null
  queueCode: string | null
}

export type OutpatientExamOrder = {
  exam: { id: string, examType: string, status: string, examCode: string | null } | null
  items: OutpatientExamItem[]
}

export type MstItemOption = {
  id: string
  code: string
  name: string
  department?: { code: string, name: string } | null
  roomType?: { code: string, name: string } | null
}

export type PharmacyOrderGroup = {
  encounter: OutpatientEncounter
  orders: Prescription[]
  hasAdditional: boolean
}

export type ApiError = {
  response?: {
    data?: {
      message?: string
      errors?: Array<{ field?: string, message?: string }>
    }
  }
}

export type RegistrationRow = {
  id: number
  id_reg: string
  serviceType: string
  statusRegistration?: string
  patient?: {
    firstName?: string | null
    middleName?: string | null
    lastName?: string | null
  } | null
}

export type AuditLog = {
  id: number
  entity?: string | null
  action: string
  actorId: number | null
  actorName?: string | null
  notes: string | null
  payloadBefore?: Record<string, { from?: unknown, to?: unknown }> | null
  payloadAfter?: Record<string, { from?: unknown, to?: unknown }> | null
  createdAt: string
}

export type PricePreview = {
  tier: { code: string, label: string, percent: number } | null
  items: Array<{ lineTotal: number, unitPrice: number, basePrice: number, tierPercent: number }>
  total: number
}
