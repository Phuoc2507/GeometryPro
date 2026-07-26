import { PayOS } from '@payos/node';
import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey || !supabase) {
    return res.status(500).json({ error: 'Webhook server chưa được cấu hình đầy đủ' });
  }

  let webhookData;
  try {
    const payos = new PayOS({ clientId, apiKey, checksumKey });
    webhookData = await payos.webhooks.verify(req.body);
  } catch (error) {
    console.warn('[webhook] invalid signature:', error instanceof Error ? error.message : error);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  if (webhookData.code !== '00' && webhookData.success !== true) {
    return res.status(200).json({ success: true, message: 'Non-success event acknowledged' });
  }

  const orderCode = Number(webhookData.orderCode);
  if (!Number.isInteger(orderCode)) {
    return res.status(400).json({ error: 'Invalid order code' });
  }

  try {
    const { data, error } = await supabase.rpc('fulfill_paid_order', {
      p_order_code: orderCode,
    });
    if (error || !data?.ok) {
      console.error('[webhook] fulfillment failed:', orderCode, error?.message || data?.err);
      // A non-2xx response is intentional: PayOS should retry transient failures.
      return res.status(500).json({
        error: 'Order fulfillment failed',
        code: data?.err || error?.code || 'fulfillment_error',
      });
    }

    return res.status(200).json({
      success: true,
      duplicate: Boolean(data.duplicate),
      orderCode,
    });
  } catch (error) {
    await reportServerError(error, { route: 'webhook', orderCode });
    console.error('[webhook] unexpected fulfillment error:', orderCode, error);
    return res.status(500).json({ error: 'Order fulfillment failed' });
  }
}

export default withSentry(handler, 'webhook');
