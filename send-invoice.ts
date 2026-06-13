// ============================================================
// supabase/functions/send-invoice/index.ts
//
// Supabase Edge Function — sends invoice as a styled HTML email
// via Resend (https://resend.com — free tier: 3,000 emails/month)
//
// Deploy:
//   supabase functions deploy send-invoice
//
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set SITE_URL=https://yourdomain.com
//
// Required env vars (set in Supabase dashboard → Settings → Edge Functions):
//   RESEND_API_KEY   — from resend.com
//   SITE_URL         — your web app URL (for the "View Invoice" link)
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SITE_URL       = Deno.env.get('SITE_URL') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Admin client — bypasses RLS to read invoice data
const admin = createClient(SUPABASE_URL, SERVICE_KEY)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // ── Auth check ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // ── Parse body ────────────────────────────────────────
    const { invoiceId, recipientEmail, message } = await req.json()
    if (!invoiceId) return json({ error: 'invoiceId is required' }, 400)

    // ── Fetch invoice + items ─────────────────────────────
    const { data: invoice, error: invErr } = await admin
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoiceId)
      .eq('owner_id', user.id)
      .single()
    if (invErr || !invoice) return json({ error: 'Invoice not found' }, 404)

    // ── Fetch profile ─────────────────────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const toEmail = recipientEmail || invoice.customer_email
    if (!toEmail) return json({ error: 'No recipient email address' }, 400)

    const fromName  = profile?.company_name ?? 'Jaila Globals'
    const fromEmail = profile?.email ?? 'invoices@jailaglobals.com'

    // ── Build email HTML ──────────────────────────────────
    const html = buildEmailHtml({ invoice, profile, message, siteUrl: SITE_URL })

    // ── Send via Resend ───────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${fromName} <${fromEmail}>`,
        to:      [toEmail],
        subject: `Invoice ${invoice.invoice_num} from ${fromName}`,
        html,
        // Optional: BCC yourself
        // bcc: [fromEmail],
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return json({ error: 'Failed to send email', detail: resendData }, 500)
    }

    return json({ success: true, emailId: resendData.id })

  } catch (err) {
    console.error('Edge function error:', err)
    return json({ error: err.message }, 500)
  }
})

// ── JSON helper ───────────────────────────────────────────
function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// ── Email HTML builder ────────────────────────────────────
function buildEmailHtml({ invoice, profile, message, siteUrl }: {
  invoice: any, profile: any, message?: string, siteUrl: string
}) {
  const fmt   = (n: number) => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
  const fmtD  = (d: string) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
  const co    = profile?.company_name ?? 'Jaila Globals'
  const items = (invoice.invoice_items ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const itemRows = items.map((i: any) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px">${i.description}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:14px;text-align:center">${i.quantity}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:14px;text-align:right">${fmt(i.unit_price)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#111827;font-size:14px;text-align:right;font-weight:600">${fmt(i.total)}</td>
    </tr>`).join('')

  const statusColor: Record<string, string> = {
    paid: '#065f46', pending: '#92400e', overdue: '#991b1b',
  }
  const statusBg: Record<string, string> = {
    paid: '#d1fae5', pending: '#fef3c7', overdue: '#fee2e2',
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${invoice.invoice_num}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Header -->
        <tr><td style="background:#0A1628;padding:28px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                ${profile?.logo_url
                  ? `<img src="${profile.logo_url}" height="48" style="border-radius:6px" alt="${co}">`
                  : `<div style="width:48px;height:48px;background:#D4A849;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#0A1628">${co.charAt(0)}</div>`}
                <div style="margin-top:10px;color:#ffffff;font-size:18px;font-weight:600">${co}</div>
                <div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:2px">${profile?.address ?? ''}</div>
              </td>
              <td style="text-align:right;vertical-align:top">
                <div style="color:rgba(255,255,255,.4);font-size:11px;letter-spacing:.08em;text-transform:uppercase">Invoice</div>
                <div style="color:#D4A849;font-size:24px;font-weight:700;margin-top:4px">${invoice.invoice_num}</div>
                <div style="margin-top:8px">
                  <span style="background:${statusBg[invoice.status]??statusBg.pending};color:${statusColor[invoice.status]??statusColor.pending};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${invoice.status.toUpperCase()}</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Meta row -->
        <tr><td style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #f0f0f0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Issue Date<br><span style="font-size:14px;color:#111827;font-weight:600;text-transform:none">${fmtD(invoice.invoice_date)}</span></td>
              <td style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Due Date<br><span style="font-size:14px;color:#111827;font-weight:600;text-transform:none">${fmtD(invoice.due_date)}</span></td>
              <td style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;text-align:right">Amount Due<br><span style="font-size:18px;color:#0A1628;font-weight:700;text-transform:none">${fmt(invoice.total)}</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Parties -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px">Bill to</div>
                <div style="font-size:15px;font-weight:600;color:#111827">${invoice.customer_name}</div>
                ${invoice.customer_address ? `<div style="font-size:13px;color:#6b7280;margin-top:3px">${invoice.customer_address}</div>` : ''}
                ${invoice.customer_phone   ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${invoice.customer_phone}</div>` : ''}
                ${invoice.customer_email   ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${invoice.customer_email}</div>` : ''}
              </td>
              <td style="vertical-align:top;text-align:right">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px">From</div>
                <div style="font-size:15px;font-weight:600;color:#111827">${co}</div>
                ${profile?.email ? `<div style="font-size:13px;color:#6b7280;margin-top:3px">${profile.email}</div>` : ''}
                ${profile?.phone ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${profile.phone}</div>` : ''}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Personal message -->
        ${message ? `
        <tr><td style="padding:20px 32px;border-bottom:1px solid #f0f0f0">
          <div style="font-size:14px;color:#374151;line-height:1.7;background:#f9fafb;border-left:3px solid #D4A849;padding:12px 16px;border-radius:0 6px 6px 0">${message.replace(/\n/g, '<br>')}</div>
        </td></tr>` : ''}

        <!-- Items table -->
        <tr><td style="padding:24px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280">Description</th>
                <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280">Qty</th>
                <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280">Unit Price</th>
                <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:16px 32px 24px">
          <table cellpadding="0" cellspacing="0" style="margin-left:auto;min-width:240px">
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280">Subtotal</td><td style="padding:5px 0 5px 24px;font-size:13px;color:#374151;text-align:right;font-weight:500">${fmt(invoice.subtotal)}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280">VAT (${invoice.vat_rate}%)</td><td style="padding:5px 0 5px 24px;font-size:13px;color:#374151;text-align:right;font-weight:500">${fmt(invoice.vat_amount)}</td></tr>
            <tr style="border-top:2px solid #0A1628">
              <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0A1628">Total</td>
              <td style="padding:12px 0 0 24px;font-size:16px;font-weight:700;color:#0A1628;text-align:right">${fmt(invoice.total)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Bank details + Terms -->
        ${(profile?.bank_name || invoice.notes) ? `
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f0f0f0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${profile?.bank_name ? `
              <td style="vertical-align:top">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px">Payment Details</div>
                <div style="font-size:13px;color:#374151;font-weight:600">${profile.bank_name}</div>
                <div style="font-size:13px;color:#6b7280">${profile.account_name ?? ''}</div>
                <div style="font-size:13px;color:#6b7280">Acct: ${profile.bank_account ?? ''}</div>
              </td>` : '<td></td>'}
              ${invoice.notes ? `
              <td style="vertical-align:top;text-align:right">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px">Terms</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.6">${invoice.notes}</div>
              </td>` : '<td></td>'}
            </tr>
          </table>
        </td></tr>` : ''}

        <!-- CTA -->
        ${siteUrl ? `
        <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #f0f0f0">
          <a href="${siteUrl}/invoice/${invoice.id}" style="display:inline-block;background:#0A1628;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">View Invoice Online</a>
        </td></tr>` : ''}

        <!-- Footer -->
        <tr><td style="padding:20px 32px;text-align:center;border-top:1px solid #f0f0f0">
          <div style="font-size:12px;color:#9ca3af">This invoice was sent by <strong style="color:#6b7280">${co}</strong> using Jaila Globals Invoice Suite.</div>
          <div style="font-size:11px;color:#d1d5db;margin-top:4px">If you have questions, contact ${profile?.email ?? co}.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
