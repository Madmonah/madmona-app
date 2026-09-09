-- 🧾 (٩/٩/٢٠٢٦ — آخر الليل) البيع اليدوي لمنتج/خدمة — مطبّق لايف (migration: record_manual_sale)
-- محمد: «المنتج أو الخدمة لو هيتم تسجيلهم يدوي مش عن طريق إدارة الحجوزات هيحصل ده إزاي؟»
-- record_manual_sale(p_supplier_id, p_kind 'product'|'service', p_item_id, p_qty, p_amount, p_customer_name,
--                    p_customer_phone, p_payment_method, p_note, p_token)
--   الحارس schedule_edit_ok · قيد financial_transactions (direction in · category 'مبيعات' · reference_type 'manual_sale'
--   · reference_id = الصنف · staff_id = الموظف اللي سجّل) · المنتج: current_stock -= qty.
-- الواجهة: components/ManualSaleModal.tsx — زرار «بيع» في المنتجات (inventory_products) والخدمات (services_catalog).
-- اختبار بجلسة محمد: خدمة «قص اطراف» → قيد 250 ج → اتمسح.
select 1;
