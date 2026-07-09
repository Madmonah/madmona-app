import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TRUSTEE_ID = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694';

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
  });
}

Deno.serve(async (req: Request) => {
  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ ok: false, error: 'order_id required' }, 400);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Order
    const { data: order, error: orderErr } = await sb
      .from('marketplace_orders')
      .select('id, reference_code, order_type, supplier_id, primary_listing_id, currency, subtotal_amount, delivery_fee, total_amount, guest_name, guest_phone, delivery_address, delivery_district, delivery_notes, customer_notes, payment_method')
      .eq('id', order_id)
      .single();
    if (orderErr || !order) return json({ ok: false, error: 'order not found', detail: orderErr?.message }, 404);

    // Only for unclaimed (trustee) listings — claimed restaurants get their own notifications elsewhere.
    if (order.supplier_id !== TRUSTEE_ID) {
      return json({ ok: true, skipped: 'not_trustee_supplier' });
    }

    // 2. Items
    const { data: items } = await sb
      .from('marketplace_order_items')
      .select('name_snapshot, unit_price, quantity, line_total, item_notes, created_at')
      .eq('order_id', order_id)
      .order('created_at', { ascending: true });

    // 3. Listing (for restaurant title + phone)
    if (!order.primary_listing_id) return json({ ok: false, error: 'no primary_listing_id' }, 422);
    const { data: listing } = await sb
      .from('listings')
      .select('id, title, slug, contact_phone, district, category_id')
      .eq('id', order.primary_listing_id)
      .single();
    if (!listing || !listing.contact_phone) {
      return json({ ok: false, error: 'listing has no contact_phone' }, 422);
    }

    // Also try draft for lead context (place_id, lead_category)
    const { data: draft } = await sb
      .from('listing_drafts')
      .select('metadata')
      .eq('converted_listing_id', listing.id)
      .maybeSingle();

    const ref = order.reference_code || String(order_id).slice(0, 8);
    const fmt = (n: any) => Number(n || 0).toFixed(0);

    const itemsText = (items || []).map((it, i) => {
      let line = `${i + 1}. ${it.quantity} × ${it.name_snapshot} = ${fmt(it.line_total)} ج`;
      if (it.item_notes) line += `\n   ملاحظة: ${it.item_notes}`;
      return line;
    }).join('\n');

    const customerParts: string[] = [];
    if (order.guest_name) customerParts.push(order.guest_name);
    if (order.guest_phone) customerParts.push(order.guest_phone);
    const customerLine = customerParts.join(' • ') || 'عميل مضمونة';

    const addressLine = [order.delivery_address, order.delivery_district].filter(Boolean).join(' — ') || 'بيتأكّد';

    const deliveryFeeNote = Number(order.delivery_fee) > 0
      ? `(منهم توصيل: ${fmt(order.delivery_fee)} ج)\n`
      : '';

    const notesLine = order.delivery_notes
      ? `\nملاحظات العميل: ${order.delivery_notes}`
      : '';

    const paymentLine = order.payment_method === 'cod'
      ? `💵 الدفع: كاش عند الاستلام — حصِّل ${fmt(order.total_amount)} ج من العميل عند التسليم.`
      : `✅ الدفع: مدفوع أونلاين عبر مضمونة.`;

    const message = `طلب جديد على مضمونة 🍽️\nالمطعم: ${listing.title}\nمرجع: ${ref}\n\n${itemsText}\n\nالمجموع: ${fmt(order.total_amount)} ج\n${deliveryFeeNote}${paymentLine}\nالعميل: ${customerLine}\nالعنوان: ${addressLine}${notesLine}\n\nللموافقة بنفس الأسعار رد بـ: قبول ${ref}\nلتعديل الأسعار رد بـ: تعديل ${ref}\nلو مش متاح حاليًا رد بـ: رفض ${ref}\n\nعمولة مضمونة الموحدة = 10٪ من الأوردر.`;

    // 4. Queue
    const { data: queued, error: queueErr } = await sb
      .from('whatsapp_outbound_queue')
      .insert({
        recipient_phone: listing.contact_phone,
        recipient_name: listing.title,
        message,
        campaign: 'restaurant_order_notify',
        agent_name: 'restaurant-order-notify',
        status: 'pending',
        metadata: {
          order_id: order.id,
          listing_id: listing.id,
          reference_code: ref,
          action: 'accept_reject_edit',
          place_id: (draft?.metadata as any)?.place_id ?? null
        }
      })
      .select('id, status')
      .single();

    if (queueErr) return json({ ok: false, error: 'queue insert failed', detail: queueErr.message }, 500);

    return json({ ok: true, queued_id: queued?.id, queued_status: queued?.status, recipient: listing.contact_phone, ref });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
