<script setup lang="ts">
import { handleError, handleSuccess } from '~/utils/handlers'
import {
  renderQuestionnaireTemplate,
  buildQuestionnairePrintContext,
  extractTemplateStyles,
  printQuestionnaireHtml
} from '~/composables/questionnaire/useQuestionnairePrint'
import type { QuestionnairePrintContext } from '~/composables/questionnaire/useQuestionnairePrint'

const api = useApi()
const toast = useToast()

type QuestionnaireRow = {
  questionnaire_id: string
  questionnaire_code: string
  questionnaire_name: string
  portalKey?: string | null
  printTemplate?: string | null
  print_template?: string | null
}

const props = defineProps<{
  row: QuestionnaireRow | null
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const template = ref('')
const loading = ref(false)
const previewOpen = ref(false)
const previewHtml = ref('')
const previewCssExtra = ref('')

const logoUrl = ref('')
const logoFile = ref<HTMLInputElement | null>(null)

const logoWidth = ref(96)
const logoTop = ref(0)
const logoLeft = ref(5)

function resizeHeaderLogo(dataUrl: string, widthPx: number = logoWidth.value): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.max(0.01, widthPx / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      if (Math.abs(w - img.width) < 1 && Math.abs(h - img.height) < 1) return resolve(dataUrl)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

let logoRerenderTimer: ReturnType<typeof setTimeout> | undefined
watch([logoWidth, logoLeft, logoTop], async () => {
  if (!logoUrl.value) return
  clearTimeout(logoRerenderTimer)
  logoRerenderTimer = setTimeout(async () => {
    logoUrl.value = await resizeHeaderLogo(logoUrl.value, logoWidth.value)
    runPreview()
  }, 300)
})

function setLogoOpt(key: 'width' | 'top' | 'left', v: string | number | null | undefined) {
  const n = Number(v)
  if (!Number.isFinite(n)) return
  if (key === 'width') logoWidth.value = Math.max(32, Math.min(240, Math.round(n)))
  else if (key === 'top') logoTop.value = Math.max(0, Math.min(30, n))
  else logoLeft.value = Math.max(0, Math.min(40, n))
}

async function onUploadLogo() {
  const file = logoFile.value?.files?.[0]
  if (!file) return
  const raw = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
  logoUrl.value = await resizeHeaderLogo(raw, logoWidth.value)
  template.value = template.value.replace(/src="data:image[^"]*"/g, '{{ logoUrl }}')
  runPreview()
}

function ctxWithLogo(ctx: QuestionnairePrintContext) {
  ctx.logoUrl = logoUrl.value || ''
  return ctx
}

watch(
  () => props.row,
  async (row) => {
    if (!row) return
    let stored = row.print_template ?? row.printTemplate ?? ''
    try {
      const res = await api.get(`/questionnaire/${row.questionnaire_id}`)
      const detail = res.data?.data ?? res.data
      if (detail) {
        stored = detail.print_template ?? detail.printTemplate ?? stored
      }
    } catch {
      // fallback ke data dari baris list
    }
    const om = stored.match(/<!--print-opts--><style>:root\{([^}]*)\}<\/style>/)
    if (om) {
      const pv = om[1] ?? ''
      const wm = pv.match(/--hdr-width:\s*([\d.]+)px/)
      const tm = pv.match(/--hdr-top:\s*([\d.]+)mm/)
      const lm = pv.match(/--hdr-left:\s*([\d.]+)mm/)
      if (wm) logoWidth.value = Number(wm[1])
      if (tm) logoTop.value = Number(tm[1])
      if (lm) logoLeft.value = Number(lm[1])
      stored = stored.replace(/<!--print-opts--><style>[\s\S]*?<\/style>/g, '')
    }
    const m = stored.match(/src="(data:image[^"]*)"/)
    if (m) {
      logoUrl.value = await resizeHeaderLogo(m[1], logoWidth.value)
      stored = stored.replace(/src="data:image[^"]*"/g, '{{ logoUrl }}')
    }
    template.value = stored
    open.value = true
  },
  { immediate: true }
)

const defaultTemplate = `<style>
  /* =========================================================
     RESET
     ========================================================= */

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;

    font-family:
      Arial,
      Helvetica,
      sans-serif;

    font-size: 9.5pt;
    line-height: 1.4;

    color: #1f2937;
  }


  /* =========================================================
     DOCUMENT TITLE
     ========================================================= */

  h1 {
    margin: 0 0 10px 0;

    padding: 0 0 8px 0;

    text-align: center;

    font-size: 16pt;
    font-weight: 700;

    color: #24364f;

    text-transform: uppercase;

    letter-spacing: 0.3px;

    border-bottom: 2px solid #24364f;
  }


  /* =========================================================
     HEADER
     ========================================================= */

  .document-header {
    margin-bottom: 10px;

    margin-top: var(--hdr-top, 0mm);
  }

  .header-top {
    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 12px;

    padding-bottom: 7px;

    border-bottom: 2px solid #24364f;
  }

  .header-logo {
    width: 65px;
    height: 65px;

    display: flex;

    align-items: center;
    justify-content: center;

    border: 1px solid #d5dce5;

    border-radius: 4px;

    color: #6b7280;

    font-size: 8pt;
  }

  .header-logo-img {
    width: var(--hdr-width, 96px);
    height: auto;

    object-fit: contain;

    padding-left: var(--hdr-left, 5mm);
  }

  .header-title {
    flex: 1;

    text-align: center;
  }

  .header-title h1 {
    margin: 0;

    padding: 0;

    border: 0;

    font-size: 16pt;
  }

  .header-subtitle {
    margin-top: 3px;

    color: #6b7280;

    font-size: 8.5pt;
  }

  .header-code {
    width: 95px;

    text-align: right;

    padding-right: 5px;

    color: #6b7280;

    font-size: 7.5pt;
  }

  .header-code strong {
    display: block;

    margin-top: 2px;

    color: #111827;

    font-size: 8.5pt;
  }


  /* =========================================================
     DOCUMENT INFORMATION
     ========================================================= */

  .document-info {
    display: grid;

    grid-template-columns:
      repeat(3, 1fr);

    gap: 7px;

    margin-top: 7px;
  }

  .info-box {
    padding: 5px 7px;

    border: 1px solid #d7dee7;

    border-radius: 3px;

    background: #fafbfc;
  }

  .info-label {
    display: block;

    margin-bottom: 2px;

    color: #6b7280;

    font-size: 7pt;

    text-transform: uppercase;
  }

  .info-value {
    display: block;

    color: #111827;

    font-size: 8.5pt;

    font-weight: 600;
  }


  /* =========================================================
     SECTION TITLE
     ========================================================= */

  .section-title {
    margin-top: 12px;
    margin-bottom: 6px;

    padding: 6px 9px;

    background: #e9eef5;

    border-left: 4px solid #24364f;

    color: #24364f;

    font-size: 9.5pt;

    font-weight: 700;

    text-transform: uppercase;

    letter-spacing: 0.2px;

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }


  /* =========================================================
     SECTION SUBTITLE
     ========================================================= */

  .section-subtitle {
    display: flex;

    align-items: center;

    gap: 7px;

    margin-top: 9px;
    margin-bottom: 5px;

    padding: 5px 7px;

    background: #f6f8fa;

    border: 1px solid #d6dde6;

    border-radius: 3px;

    color: #111827;

    font-size: 9pt;

    font-weight: 700;

    page-break-after: avoid;
    break-after: avoid;

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .section-number {
    width: 21px;
    height: 21px;

    display: inline-flex;

    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 50%;

    background: #24364f;

    color: white;

    font-size: 8pt;

    font-weight: 700;

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }


  /* =========================================================
     DATA DIRI
     ========================================================= */

  .data-diri-table {
    width: 100%;

    border-collapse: collapse;

    table-layout: fixed;

    margin-bottom: 5px;
  }

  .data-diri-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .data-diri-table td {
    padding: 3px 6px;

    vertical-align: top;

    border-bottom: 1px solid #e5e7eb;
  }

  .data-diri-table .label {
    width: 27%;

    color: #374151;

    font-weight: 600;
  }

  .data-diri-table .colon {
    width: 3%;

    text-align: center;

    color: #6b7280;

    font-weight: 600;
  }

  .data-diri-table td:last-child {
    width: 70%;

    color: #111827;

    overflow-wrap: anywhere;
  }

  .data-diri-table tr:nth-child(even) {
    background: #fafafa;

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }


  /* =========================================================
     SUMMARY
     ========================================================= */

  .answer-summary {
    display: flex;

    justify-content: flex-end;

    gap: 7px;

    margin-top: 6px;
  }

  .summary-item {
    padding: 5px 9px;

    border: 1px solid #d7dee7;

    border-radius: 3px;

    color: #6b7280;

    font-size: 8pt;

    background: #fafafa;
  }

  .summary-value {
    margin-left: 4px;

    color: #24364f;

    font-weight: 700;
  }


  /* =========================================================
     QUESTIONS
     ========================================================= */

  .question-list {
    margin: 0;

    padding-left: 24px;
  }

  .question-item {
    margin-bottom: 2px;

    padding: 3px 5px;

    border-bottom: 1px solid #e5e7eb;

    page-break-inside: avoid;
    break-inside: avoid;
  }

  .question-item:last-child {
    border-bottom: 0;
  }

  .flex-row {
    display: flex;

    align-items: flex-start;

    justify-content: space-between;

    gap: 12px;
  }

  .question-text {
    flex: 1;

    min-width: 0;

    color: #1f2937;
  }

  .answer {
    min-width: 105px;

    max-width: 35%;

    padding: 2px 6px;

    border: 1px solid #dce2e8;

    border-radius: 3px;

    background: #f7f9fb;

    color: #24364f;

    font-weight: 700;

    text-align: right;

    overflow-wrap: anywhere;

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }


  /* =========================================================
     ANSWER DETAIL
     ========================================================= */

  .answer-detail {
    margin-top: 3px;

    padding: 3px 6px;

    border-left: 2px solid #d5dce5;

    background: #fafafa;

    color: #6b7280;

    font-size: 8pt;
  }


  /* =========================================================
     CONSENT
     ========================================================= */

  .consent-section {
    margin-top: 14px;

    padding: 9px 11px;

    border: 1px solid #d8dee6;

    border-left: 4px solid #7f8f63;

    border-radius: 3px;

    background: #f8fafc;

    color: #374151;

    font-size: 8.5pt;

    line-height: 1.45;

    page-break-inside: avoid;
    break-inside: avoid;

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .consent-title {
    margin-bottom: 4px;

    color: #24364f;

    font-size: 9pt;

    font-weight: 700;
  }

  .consent-list {
    margin: 6px 0 0 20px;

    padding: 0;
  }

  .consent-list li {
    margin-bottom: 4px;

    padding-left: 2px;

    text-align: justify;
  }


  /* =========================================================
     SIGNATURE
     ========================================================= */

  .signature-wrapper {
    display: flex;

    justify-content: flex-end;

    margin-top: 17px;

    page-break-inside: avoid;
    break-inside: avoid;
  }

  .signature-area {
    width: 205px;

    text-align: center;
  }

  .sign-city {
    font-size: 8.5pt;
  }

  .signature-space {
    height: 50px;
  }

  .sign-ttd {
    color: #6b7280;

    font-size: 8pt;
  }

  .sign-name {
    margin-top: 3px;

    color: #111827;

    font-size: 9pt;

    font-weight: 700;

    text-decoration: underline;
  }


  /* =========================================================
     FOOTER
     ========================================================= */

  .document-footer {
    display: flex;

    align-items: center;

    justify-content: space-between;

    margin-top: 12px;

    padding-top: 5px;

    border-top: 1px solid #d9dee7;

    color: #6b7280;

    font-size: 7.5pt;

    page-break-inside: avoid;
  }


  /* =========================================================
     PAGE BREAK
     ========================================================= */

  .page-break {
    height: 0;

    page-break-before: always;

    break-before: page;
  }


  /* =========================================================
     PRINT
     ========================================================= */

  @media print {

    html,
    body {
      background: #ffffff;
    }

    .no-print {
      display: none !important;
    }

    .page-break {
      page-break-before: always;

      break-before: page;
    }
  }


  /* =========================================================
     RESPONSIVE PREVIEW
     ========================================================= */

  @media screen and (max-width: 650px) {

    .header-top {
      display: block;
    }

    .header-logo,
    .header-code {
      display: none;
    }

    .header-title h1 {
      font-size: 14pt;
    }

    .document-info {
      grid-template-columns: 1fr;
    }

    .flex-row {
      display: block;
    }

    .answer {
      display: block;

      max-width: 100%;

      margin-top: 3px;

      text-align: left;
    }

    .signature-wrapper {
      justify-content: center;
    }
  }
</style>


<!-- =========================================================
     HEADER
     ========================================================= -->

  <div class="document-header">

    <div class="header-top">

    {% if logoUrl %}
      <img src="{{ logoUrl }}" class="header-logo-img" alt="Gambar dokumen" />
    {% else %}
      <div class="header-logo">
        LOGO
      </div>
    {% endif %}

    <div class="header-title">

      <h1>
        {{ documentTitle }}
      </h1>

      <div class="header-subtitle">
        Medical Check Up / Health Questionnaire
      </div>

    </div>

    <div class="header-code">

      No. RM

      <strong>
        {{ patientCode }}
      </strong>

    </div>

  </div>

  <div class="document-info">

    <div class="info-box">

      <span class="info-label">
        No. Registrasi
      </span>

      <span class="info-value">
        {{ registrationRef }}
      </span>

    </div>


    <div class="info-box">

      <span class="info-label">
        Tanggal Pemeriksaan
      </span>

      <span class="info-value">
        {{ examDate }}
      </span>

    </div>


    <div class="info-box">

      <span class="info-label">
        Perusahaan
      </span>

      <span class="info-value">
        {{ companyName }}
      </span>

    </div>

  </div>

</div>


<!-- =========================================================
     DATA DIRI
     ========================================================= -->

<div class="section-title">
  DATA DIRI
</div>


<table class="data-diri-table">

  <tr>
    <td class="label">
      Nama Lengkap
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientName }} ({{ patientGender }})
    </td>
  </tr>


  <tr>
    <td class="label">
      Tgl, Bln, Tahun Lahir
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientDob }}
      (Umur : {{ patientAge }})
    </td>
  </tr>


  <tr>
    <td class="label">
      Perusahaan
    </td>

    <td class="colon">:</td>

    <td>
      {{ companyName }}
    </td>
  </tr>


  <tr>
    <td class="label">
      Status Pernikahan
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientMaritalStatus }}
    </td>
  </tr>


  <tr>
    <td class="label">
      Alamat Rumah
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientAddress }}
    </td>
  </tr>


  <tr>
    <td class="label">
      Telepon
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientPhone }}
    </td>
  </tr>


  <tr>
    <td class="label">
      Posisi Pekerjaan
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientPosition }}
    </td>
  </tr>


  <tr>
    <td class="label">
      No. RM / Registrasi
    </td>

    <td class="colon">:</td>

    <td>
      {{ patientCode }} / {{ registrationRef }}
    </td>
  </tr>

</table>


<!-- =========================================================
     SUMMARY
     ========================================================= -->

<div class="answer-summary">

  <div class="summary-item">
    Terjawab
    <span class="summary-value">
      {{ answeredCount }}
    </span>
  </div>

  <div class="summary-item">
    Total Pertanyaan
    <span class="summary-value">
      {{ totalCount }}
    </span>
  </div>

</div>


{% if sections.length %}


<!-- =========================================================
     QUESTION TITLE
     ========================================================= -->

<div class="section-title">
  ISILAH PERTANYAAN DIBAWAH DENGAN SEBENARNYA
</div>


<!-- =========================================================
     QUESTIONS
     ========================================================= -->

{% for section in sections %}

<div class="section-subtitle">

  <span class="section-number">
    {{ loop.index }}
  </span>

  <span>
    {{ section.title }}
  </span>

</div>


<ol class="question-list">

  {% for q in section.questions %}

  <li class="question-item">

    <div class="flex-row">

      <span class="question-text">
        {{ q.questionText }}
      </span>

      <span class="answer">

        {% if q.answerValue %}

          {{ q.answerValue }}

        {% else %}

          Belum diisi

        {% endif %}

      </span>

    </div>

  </li>

  {% endfor %}

</ol>

{% endfor %}


<!-- =========================================================
     CONSENT
     ========================================================= -->

<div class="consent-section">

  <div class="consent-title">
    PERNYATAAN DAN PERSETUJUAN
  </div>

  <strong>
    Isian diatas telah saya isi dengan sadar dan benar.
  </strong>

  <br>

  <strong>
    Dengan menandatangani surat untuk melakukan MCU ini,
    saya memberikan izin kepada:
  </strong>


  <ol class="consent-list">

    <li>
      <strong>
        Pemeriksa kesehatan tersebut diatas untuk melakukan
        pemeriksaan kesehatan dengan komponen yang telah
        ditentukan dan mengolah hasil pemeriksaan kesehatan
        tersebut.
      </strong>
    </li>


    <li>
      <strong>
        Memberikan hasil pemeriksaan tersebut kepada bagian
        HRD / Dokter perusahaan tempat saya bekerja atau akan
        bekerja, untuk disimpan dan dikelola pada fasilitas
        perusahaan (Jika MCU difasilitasi oleh perusahaan).
      </strong>
    </li>

  </ol>

</div>


<!-- =========================================================
     SIGNATURE
     ========================================================= -->

<div class="signature-wrapper">

  <div class="signature-area">

    <div class="sign-city">
      {{ signatureLine }}
    </div>

    <div class="signature-space"></div>

    <div class="sign-ttd">
      ( ttd )
    </div>

    <div class="sign-name">
      {{ patientName }}
    </div>

  </div>

</div>


{% else %}


<div class="section-title">
  DATA PERTANYAAN
</div>

<div style="
  padding: 20px;
  text-align: center;
  color: #6b7280;
  border: 1px dashed #d1d5db;
">
  Belum terdapat pertanyaan yang harus diisi.
</div>


{% endif %}


<!-- =========================================================
     FOOTER
     ========================================================= -->

<div class="document-footer">

  <div>
    {{ patientName }}
    &nbsp;|&nbsp;
    {{ patientCode }}
  </div>

</div>`

function useTemplate() {
  template.value = defaultTemplate
  runPreview()
}

function sampleContext() {
  return buildQuestionnairePrintContext({
    documentTitle: props.row?.questionnaire_name || 'KUESIONER MEDICAL CHECK - UP',
    patientName: 'Ahmad Fauzi',
    patientGender: 'MALE',
    patientDob: '1995-03-15',
    patientAge: 31,
    patientMaritalStatus: 'MARRIED',
    patientPhone: '0812-3456-7890',
    patientAddress: 'Jl. Merdeka No. 12, Jakarta Selatan, DKI Jakarta',
    patientPosition: 'Staff IT',
    patientCode: 'PAT-20260810-BR-001',
    registrationRef: 'REG-20260810-001',
    companyName: 'PT Maju Jaya',
    branchName: 'JKT - Jakarta',
    examDate: '2026-08-10',
    answers: [
      {
        questionId: 'q1',
        questionText: 'Apakah Anda memiliki keluhan saat ini?',
        questionType: 'radio',
        sectionId: 's1',
        sectionTitle: 'Umum',
        answerText: 'Tidak ada keluhan',
        answered: true
      },
      {
        questionId: 'q2',
        questionText: 'Apakah Anda merokok?',
        questionType: 'radio',
        sectionId: 's1',
        sectionTitle: 'Umum',
        answerText: 'Tidak',
        answered: true
      },
      {
        questionId: 'q3',
        questionText: 'Riwayat menstruasi terakhir?',
        questionType: 'text',
        sectionId: 's2',
        sectionTitle: 'KHUSUS WANITA',
        answerText: '12 Agustus 2026',
        answered: true
      }
    ]
  })
}

const previewCss = `
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
  body { background-color: #f0f2f5; margin: 0; padding: 20px; }
  .document-page { background: white; width: 100%; max-width: 800px; margin: 0 auto; min-height: 1050px; padding: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); position: relative; }
  h1 { text-align: center; font-size: 15px; font-weight: bold; text-decoration: underline; margin-top: 0; margin-bottom: 25px; text-transform: uppercase; }
  .section-title { font-weight: bold; text-decoration: underline; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; }
  .section-subtitle { font-weight: bold; margin-top: 10px; margin-bottom: 6px; }
  .data-diri-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .data-diri-table td { padding: 2px 0; vertical-align: top; }
  .data-diri-table td.label { width: 180px; }
  .data-diri-table td.colon { width: 15px; }
  .question-list { margin: 0; padding-left: 20px; }
  .question-item { margin-bottom: 6px; line-height: 1.3; }
  .answer { font-weight: bold; }
  .flex-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .signature-area { margin-top: 40px; text-align: right; padding-right: 40px; }
  .signature-space { height: 60px; }
  .sign-ttd { text-align: center; margin-right: -40px; }
  .sign-name { text-align: center; margin-right: -40px; }
  .consent-section { margin-top: 20px; line-height: 1.3; }
  .consent-list { margin: 5px 0 0 0; padding-left: 20px; }
  .consent-list li { margin-bottom: 5px; }
  .document-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 5px; border-top: 1px solid #d9dee7; color: #6b7280; font-size: 7.5pt; page-break-inside: avoid; }
  @media print {
    body { background-color: white; padding: 0; }
    .document-page { box-shadow: none; padding: 20px; width: 100%; max-width: 100%; }
  }
`

const previewDoc = computed(() => `
  <html lang="id">
    <head>
      <style>${previewCss}</style>
      ${previewCssExtra.value}
    </head>
    <body>
      <div class="document-page">${previewHtml.value}</div>
    </body>
  </html>
`)

const previewIframeRef = ref<HTMLIFrameElement>()

function writePreviewDoc() {
  const iframe = previewIframeRef.value
  if (!iframe) return
  const doc = iframe.contentDocument
  if (!doc) return
  doc.open()
  doc.write(previewDoc.value)
  doc.close()
}

watch(previewDoc, () => {
  writePreviewDoc()
})

watch(previewOpen, (open) => {
  if (open) nextTick(writePreviewDoc)
})

function runPreview() {
  try {
    const ctx = ctxWithLogo(sampleContext())
    const { styles, body } = extractTemplateStyles(embeddedTemplate())
    previewHtml.value = renderQuestionnaireTemplate(body, ctx)
    previewCssExtra.value = styles
    previewOpen.value = true
  } catch (err) {
    handleError(toast, err)
  }
}

function headerOptsTag() {
  return `\n\n<!--print-opts--><style>:root{--hdr-left:${logoLeft.value}mm;--hdr-top:${logoTop.value}mm;--hdr-width:${logoWidth.value}px;}</style>\n`
}

function embeddedTemplate() {
  let html = template.value
  html = html.replace(/<!--print-opts--><style>[\s\S]*?<\/style>/g, '')
  html += headerOptsTag()
  if (logoUrl.value) {
    html = html.replace(/\{\{\s*logoUrl\s*\}\}/g, logoUrl.value)
  }
  return html
}

function openPrintPreview() {
  const ctx = ctxWithLogo(sampleContext())
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(printQuestionnaireHtml(ctx, embeddedTemplate(), previewCss, {
    topMm: logoTop.value,
    leftMm: logoLeft.value
  }))
  w.document.close()
}

async function submit() {
  if (!props.row || loading.value) return
  loading.value = true
  try {
    await api.put(`/questionnaire/${props.row.questionnaire_id}`, {
      print_template: embeddedTemplate()
    })
    handleSuccess(toast, 'Template print berhasil disimpan')
    emit('saved')
    open.value = false
  } catch (err) {
    handleError(toast, err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                Print Template
              </h2>
              <p class="text-sm text-muted">
                {{ props.row?.questionnaire_code }} — {{ props.row?.questionnaire_name }}
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
          </div>
        </template>

        <div class="flex flex-col gap-3 max-h-[62vh] overflow-y-auto pr-1">
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                icon="i-lucide-file-code-2"
                variant="outline"
                label="Gunakan Template Default"
                @click="useTemplate"
              />
              <UButton
                icon="i-lucide-eye"
                variant="outline"
                label="Preview"
                @click="runPreview"
              />
              <UButton
                icon="i-lucide-printer"
                variant="outline"
                label="Buka di Print Window"
                @click="openPrintPreview"
              />
              <UButton
                icon="i-lucide-upload"
                variant="outline"
                label="Upload Gambar"
                :disabled="!row"
                @click="logoFile?.click()"
              />
              <input
                ref="logoFile"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onUploadLogo"
              />
            </div>
          </div>

          <div
            v-if="logoUrl"
            class="flex flex-wrap items-center gap-4 rounded-lg border border-default bg-elevated px-3 py-2 text-xs"
          >
            <span class="font-medium text-highlighted">
              Posisi Logo
            </span>
            <label class="flex items-center gap-1.5">
              <span class="text-muted">Lebar (px)</span>
              <UInput
                :model-value="String(logoWidth)"
                size="sm"
                type="number"
                class="w-24"
                @update:model-value="setLogoOpt('width', $event)"
              />
            </label>
            <label class="flex items-center gap-1.5">
              <span class="text-muted">Atas (mm)</span>
              <UInput
                :model-value="String(logoTop)"
                size="sm"
                type="number"
                class="w-20"
                @update:model-value="setLogoOpt('top', $event)"
              />
            </label>
            <label class="flex items-center gap-1.5">
              <span class="text-muted">Kiri (mm)</span>
              <UInput
                :model-value="String(logoLeft)"
                size="sm"
                type="number"
                class="w-20"
                @update:model-value="setLogoOpt('left', $event)"
              />
            </label>
            <p class="text-muted">
              Mempengaruhi layar &amp; print. Atas = jarak dari tepi atas kertas.
            </p>
          </div>

          <UTextarea
            v-model="template"
            :ui="{ base: 'font-mono text-xs leading-relaxed' }"
            placeholder="Tulis template HTML dengan placeholder, contoh: {{ patientName }}"
            :rows="12"
            class="w-full shrink-0"
          />

          <div class="rounded-lg border border-default bg-elevated p-3 text-xs text-muted">
            <p class="mb-1 font-medium text-highlighted">
              Placeholder yang tersedia
            </p>
            <p v-pre class="font-mono">
              {{ documentTitle }}, {{ patientName }}, {{ patientGender }}, {{ patientDob }}, {{ patientAge }}, {{ companyName }}, {{ patientMaritalStatus }}, {{ patientAddress }}, {{ patientPhone }}, {{ patientPosition }}, {{ patientCode }}, {{ registrationRef }}, {{ branchCity }}, {{ signatureCity }}, {{ signatureDate }}, {{ signatureLine }}, {{ examDate }},                {{ answeredCount }}, {{ totalCount }}, {{ logoUrl }}
            </p>
            <p class="mt-2">
              Loop: <code class="font-mono">{% for section in sections %}</code> dengan
              <code class="font-mono">section.title</code> dan
              <code class="font-mono">section.questions</code> (tiap item:
              <code class="font-mono">questionText</code>, <code class="font-mono">answerValue</code>, <code class="font-mono">answerText</code>, <code class="font-mono">optionText</code>).
              Kondisi: <code class="font-mono">{% if sections.length %}</code> / <code class="font-mono">{% endif %}</code> / <code class="font-mono">{% else %}</code>.
              Filter: <code v-pre class="font-mono">{{ name | upper }}</code>, <code v-pre class="font-mono">| lower</code>, <code v-pre class="font-mono">| default('x')</code>.
            </p>
            <p class="mt-1">
              Styling: tulis <code class="font-mono">&lt;style&gt;</code> di dalam template
              (diletakkan di bagian atas template), akan ikut di-render saat print/preview.
            </p>
            <p class="mt-1">
              Kosongkan template untuk memakai layout print bawaan (paper-document).
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton
              label="Batal"
              color="neutral"
              variant="outline"
              @click="open = false"
            />
            <UButton
              label="Simpan Template"
              color="primary"
              icon="i-lucide-save"
              :loading="loading"
              @click="submit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <UModal v-model:open="previewOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">
              Preview Template
            </h2>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="previewOpen = false"
            />
          </div>
        </template>
        <iframe
          ref="previewIframeRef"
          class="w-full h-[70vh] rounded border border-default bg-white"
        />
        <template #footer>
          <div class="flex justify-end">
            <UButton
              label="Tutup"
              color="neutral"
              variant="outline"
              @click="previewOpen = false"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
