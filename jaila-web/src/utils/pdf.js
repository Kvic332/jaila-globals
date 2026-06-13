export function buildInvoiceHtml(inv, profile = {}) {
  const fmt  = n => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const co   = profile.company_name ?? 'Jaila Globals'
  const rows = (inv.items ?? []).map(i => `
    <tr>
      <td>${i.desc}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${fmt(i.price)}</td>
      <td style="text-align:right;font-weight:700">${fmt(i.total)}</td>
    </tr>`).join('')

  const statusColors = { paid: ['#D1FAE5','#065F46'], pending: ['#FEF3C7','#92400E'], overdue: ['#FEE2E2','#991B1B'] }
  const [sBg, sText] = statusColors[inv.status] ?? statusColors.pending

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #111827; font-size: 13px; }
  .page { max-width: 760px; margin: 0 auto; padding: 0; }
  .header { background: #0A1628; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .co-name { font-size: 20px; font-weight: 700; color: #fff; margin-top: 10px; }
  .co-sub  { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 3px; }
  .inv-label { font-size: 10px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .08em; text-align: right; }
  .inv-num { font-size: 26px; font-weight: 700; color: #D4A849; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 8px; background: ${sBg}; color: ${sText}; }
  .meta { background: #F8FAFC; padding: 18px 40px; display: flex; gap: 40px; border-bottom: 1px solid #F0F0F0; }
  .meta-item label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .06em; display: block; margin-bottom: 3px; }
  .meta-item span  { font-size: 14px; font-weight: 600; color: #111827; }
  .meta-item.amount span { font-size: 20px; color: #0A1628; }
  .meta { align-items: flex-end; }
  .meta-item:last-child { margin-left: auto; }
  .parties { padding: 24px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid #F0F0F0; }
  .party label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .06em; display: block; margin-bottom: 6px; font-weight: 600; }
  .party .name  { font-size: 15px; font-weight: 600; color: #111827; }
  .party .sub   { font-size: 12px; color: #6B7280; margin-top: 3px; line-height: 1.6; }
  .party.right  { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin: 0; }
  .items { padding: 24px 40px 0; }
  th { background: #F9FAFB; padding: 9px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6B7280; text-align: left; }
  th:not(:first-child) { text-align: right; }
  th:nth-child(2) { text-align: center; }
  td { padding: 10px 14px; border-bottom: 1px solid #F3F4F6; font-size: 13px; color: #374151; }
  td:not(:first-child) { text-align: right; }
  td:nth-child(2) { text-align: center; }
  .totals { padding: 16px 40px 24px; display: flex; justify-content: flex-end; }
  .totals-inner { min-width: 240px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #6B7280; }
  .total-row.grand { border-top: 2px solid #0A1628; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #0A1628; }
  .bank { background: #F8FAFC; padding: 20px 40px; border-top: 1px solid #F0F0F0; display: flex; justify-content: space-between; }
  .bank label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; display: block; margin-bottom: 6px; }
  .bank .val   { font-size: 13px; color: #374151; line-height: 1.7; }
  .sigs { padding: 36px 40px 40px; display: flex; justify-content: space-between; }
  .sig-box { width: 210px; }
  .sig-line { border-bottom: 1px solid #D1D5DB; height: 40px; margin-bottom: 6px; }
  .sig-label { font-size: 11px; color: #9CA3AF; }
  .footer { padding: 16px 40px; border-top: 1px solid #F0F0F0; text-align: center; font-size: 11px; color: #D1D5DB; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: none; }
  }
</style></head><body>
<div class="page">
  <div class="header">
    <div>
      ${profile.logo_url
        ? `<img src="${profile.logo_url}" height="48" style="border-radius:8px" alt="${co}">`
        : `<div style="width:48px;height:48px;background:#D4A849;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#0A1628">${co.charAt(0)}</div>`}
      <div class="co-name">${co}</div>
      <div class="co-sub">${[profile.address, profile.phone, profile.email].filter(Boolean).join(' · ')}</div>
      ${profile.rc_number ? `<div class="co-sub">RC: ${profile.rc_number}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="inv-label">Invoice</div>
      <div class="inv-num">${inv.num}</div>
      <div><span class="status-badge">${inv.status.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Issue Date</label><span>${fmtD(inv.date)}</span></div>
    <div class="meta-item"><label>Due Date</label><span>${fmtD(inv.due)}</span></div>
    <div class="meta-item amount"><label>Amount Due</label><span>${fmt(inv.total)}</span></div>
  </div>

  <div class="parties">
    <div class="party">
      <label>Bill To</label>
      <div class="name">${inv.customer.name}</div>
      ${inv.customer.address ? `<div class="sub">${inv.customer.address}</div>` : ''}
      ${inv.customer.phone   ? `<div class="sub">${inv.customer.phone}</div>` : ''}
      ${inv.customer.email   ? `<div class="sub">${inv.customer.email}</div>` : ''}
    </div>
    <div class="party right">
      <label>From</label>
      <div class="name">${co}</div>
      ${profile.email ? `<div class="sub">${profile.email}</div>` : ''}
      ${profile.phone ? `<div class="sub">${profile.phone}</div>` : ''}
    </div>
  </div>

  <div class="items">
    <table>
      <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-inner">
      <div class="total-row"><span>Subtotal</span><span>${fmt(inv.subtotal)}</span></div>
      <div class="total-row"><span>VAT (${inv.vat}%)</span><span>${fmt(inv.vatAmt)}</span></div>
      <div class="total-row grand"><span>Total</span><span>${fmt(inv.total)}</span></div>
    </div>
  </div>

  ${(profile.bank_name || inv.notes) ? `
  <div class="bank">
    ${profile.bank_name ? `
    <div>
      <label>Payment Details</label>
      <div class="val">
        <strong>${profile.bank_name}</strong><br>
        ${profile.account_name ?? ''}<br>
        Account: ${profile.bank_account ?? ''}
      </div>
    </div>` : '<div></div>'}
    ${inv.notes ? `
    <div style="text-align:right">
      <label>Terms & Conditions</label>
      <div class="val" style="max-width:260px;margin-left:auto">${inv.notes}</div>
    </div>` : '<div></div>'}
  </div>` : ''}

  <div class="sigs">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature — ${co}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Customer Signature — ${inv.customer.name}</div>
    </div>
  </div>

  <div class="footer">Generated by Jaila Globals Invoice Suite · ${new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</div>
</body></html>`
}

export async function downloadInvoice(inv, element) {
  const html2pdf = (await import('html2pdf.js')).default
  const customerName = (inv.customer?.name ?? 'Customer').replace(/[^a-z0-9 \-_]/gi, '').trim()
  const filename = `${inv.num} - ${customerName}.pdf`

  await html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename,
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save()
}
