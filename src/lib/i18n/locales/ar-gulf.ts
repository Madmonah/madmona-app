// src/lib/i18n/locales/ar-gulf.ts
// 🌍 (٢٧ أغسطس ٢٠٢٦) لهجة خليجية — بس المفاتيح اللي لهجتها بتفرق عن المصري.
//    أي مفتاح مش هنا بيرجع للمصري تلقائيًا عبر translate() — نفس RTL ونفس الخط.
import type { Dict } from '../dictionary'

export const arGulf: Partial<Dict> = {
  // ---- common ----
  'common.search': 'دوّر على اللي تبيه',
  'common.continue': 'كمّل',
  'common.error': 'صار خطأ، حاول مرة ثانية',

  // ---- nav ----
  'nav.rent_from_us': 'اطلب من مضمونة',
  'nav.add_listing': 'أضف منتجك',
  'nav.login': 'تسجيل الدخول',
  'nav.login_desc': 'عندك حساب من قبل',
  'nav.share_desc': 'أرسل الموقع لربعك',
  'nav.share_text': 'مضمونة 🟢 — معاملاتك مضمونة في مصر.',

  // ---- home ----
  'home.hero.subtitle': 'سوق مصري واحد: أجّر، اشترِ، واحجز خدمات ومطاعم وتجميل — كله بحماية كاملة ودفع سريع.',
  'home.hero.cta_browse': 'تصفّح السوق',
  'home.hero.cta_list': 'أضف منتجك',
  'home.hero.search_placeholder': 'دوّر على شاليه، سيارة، منتج، مطعم، أو خدمة...',
  'home.pillars.title': 'ليش مضمونة',
  'home.pillars.protection.desc': 'كل عملية مؤمّنة للطرفين، مع تحقق من الهوية وتوثيق للموردين.',
  'home.pillars.payouts.desc': 'تحصيل آمن وتحويل سريع وواضح بدون تعقيد.',
  'home.pillars.support.desc': 'فريق ودعم ذكي يرد خلال ثوانٍ على مدار الساعة.',
  'home.categories.title': 'وش تقدر تستأجر',
  'home.how.title': 'كيف تشتغل',
  'home.how.step1.desc': 'تصفّح آلاف المنتجات ولاقي اللي يناسبك.',
  'home.how.step2.desc': 'احجز في ثوانٍ مع حماية كاملة على فلوسك.',
  'home.how.step3.desc': 'استلم اللي استأجرته وأنت مطمّن — مضمون.',
  'home.supplier.title': 'عندك شي تأجّره؟',
  'home.supplier.desc': 'أضف منتجك مجانًا، وخلّ أنظمتنا تجيب لك الحجوزات. ما ناخذ نسبتنا إلا لما تكسب.',
  'home.news.sub': 'أخبار لحظية من أفضل المصادر المصرية والعالمية · تتجدد كل ٣ دقايق',
  'home.see_all': 'شوف الكل',
  'home.cats.empty': 'ما فيه فئات للحين.',
  'home.how.s1.desc': 'تصفّح الخدمات أو ابحث في فئة معيّنة. شوف الأسعار والصور قبل أي قرار.',
  'home.how.s2.desc': 'اختر الوقت اللي يناسبك واحجز فورًا. التأكيد يوصلك على واتساب من صاحب الإعلان مباشرة.',
  'home.how.s3.desc': 'ادفع كاش أو InstaPay. ما فيه رسوم مخفية، ومضمون إنك ما تلاقي مفاجآت.',
  'home.contact.title2': 'معنا',
  'home.contact.rate_sub': 'رأيك يفرق معنا',
  'footer.about': 'سوق مصري مضمون للتأجير والبيع والخدمات والمطاعم والتجميل — منصة جديدة تنمو بسرعة، انطلقت في مايو ٢٠٢٦.',
  'footer.follow': 'تابعنا',

  // ---- marketplace ----
  'market.supplier_cta': 'عندك شي تأجّره؟ سجّل منتجك في ٦٠ ثانية',
  'market.search_placeholder': 'ابحث عن مساحة، عقار، سيارة، معدات...',
  'market.no_results': 'ما فيه نتائج، جرّب بحث ثاني',
  'market.book_now': 'احجز الحين',
  'market.no_results_sub': 'جرّب بحث أو فلتر ثاني',
  'market.price_on_request': 'تواصل معنا 💬',
  'market.load_more': 'عرض المزيد',
  'cat.vehicles': 'سيارات ومركبات',

  // ---- listing ----
  'listing.not_found_title': 'ما لقينا هذا المنتج',
  'listing.not_found_sub': 'يمكن انحذف أو ما انشر للحين',
  'listing.demo_desc': 'هذا نموذج لفئة تدعمها مضمونة. ما فيه موردين حقيقيين فيها للحين — إذا تبي نبلّغك لما تتوفر، راسلنا على واتساب.',
  'listing.no_reviews': 'ما فيه تقييمات للحين. كن أول من يقيّم!',
  'listing.notify_available': 'بلّغني لما يتوفر',
  'listing.contact_whatsapp': 'تواصل على واتساب',
  'listing.guaranteed_note': 'حجز مضمون · بدون رسوم مخفية',

  // ---- booking ----
  'booking.notes': 'ملاحظات إضافية (اختياري)',
  'booking.login_first': 'سجّل دخولك أول',
  'booking.login_desc': 'عشان تحجز، لازم تسجّل دخولك أو تسوّي حساب جديد.',
  'book.err_end_after_start': 'تاريخ النهاية لازم يكون بعد تاريخ البداية',
  'book.err_slot_taken': 'هذا الموعد محجوز. اختر وقت ثاني.',
  'book.paused_help': 'إذا تبي تتواصل مع صاحب الإعلان، راسلنا على واتساب ونوصّلك فيه.',
  'book.review_eta': 'عادةً ياخذ أقل من ٢٤ ساعة. احفظه بالمفضلة ونبلّغك أول ما يفتح الحجز.',
  'book.no_pricing_body': 'عشان تحجز، تواصل مع صاحب الإعلان مباشرة.',
  'book.addons_sub': 'اختر اللي تحتاجه مع حجزك. التكلفة تنضاف على الإجمالي.',
  'book.notes_placeholder': 'أي طلبات خاصة أو معلومات تبي توصّلها لصاحب الإعلان',
  'book.id_placeholder': '١٤ رقم — أو خلّه فاضي الحين',
  'book.id_saved': 'رقم هويتك محفوظ. تقدر تعدّله إذا تبي.',
  'book.footer_normal': 'حجزك يتأكد بعد موافقة صاحب الإعلان. تقدر تتابع حالته من «حجوزاتي».',

  // ---- auth ----
  'auth.err_phone': 'رقم الجوال غير صحيح. اكتبه كذا: 01XXXXXXXXX',
  'auth.err_invalid_creds': 'الرقم أو كلمة المرور غلط. تأكد منهم.',
  'auth.err_not_confirmed': 'الحساب ما تفعّل للحين. تواصل معنا على واتساب +201002229982 للتفعيل.',
  'auth.err_generic': 'صار خطأ، حاول مرة ثانية',
  'auth.err_email': 'اكتب إيميل صحيح (نحتاجه إذا نسيت كلمة المرور)',
  'auth.err_password_mismatch': 'كلمتا المرور ما تتطابقان',
  'auth.err_account_exists': 'فيه حساب بهذا الرقم من قبل. سجّل دخولك أو استرجع كلمة المرور.',
  'auth.phone_label': 'رقم الجوال',
  'auth.forgot': 'نسيتها؟',
  'auth.no_account_yet': 'ما عندك حساب؟',
  'auth.sub_signup': 'سوّ حسابك وابدأ الحجز فورًا',
  'auth.email_help_text': 'نحتاجه عشان نقدر نساعدك تسترجع كلمة المرور إذا نسيتها',
  'auth.id_help_text': 'يسرّع حجزك إذا حجزت شي يحتاج تحقق من الهوية (سيارات، عقارات...). بياناتك آمنة — ما يشوفها إلا صاحب الإعلان اللي تحجز عنده.',
  'auth.have_account_q': 'عندك حساب من قبل؟',
  'auth.success_body': 'حسابك قيد التفعيل. تواصل معنا على واتساب للتفعيل وبعدها تقدر تسجّل دخولك.',

  // ---- account ----
  'account.confirm_signout': 'متأكد إنك تبي تسجّل خروج؟',
  'account.login_sub': 'سجّل دخولك عشان تشوف حسابك',
  'account.no_bookings': 'ما حجزت شي للحين',
  'account.no_favorites': 'ما فيه شي محفوظ',
  'account.bookings_empty_sub': 'تصفّح السوق وابدأ تحجز اللي يعجبك',
  'account.favorites_empty_title': 'ما فيه منتجات مفضلة للحين',
  'account.favorites_empty_sub': 'لما تلاقي منتج يعجبك، اضغط على القلب عشان تحفظه هنا',
  'bstatus.desc_pending_payment': 'تواصل مع صاحب الإعلان لتأكيد الدفع وبدء الحجز.',
  'bstatus.desc_confirmed': 'الحجز مؤكد. صاحب الإعلان بيكون جاهز في الموعد.',
  'bstatus.desc_completed': 'الحجز خلص. إذا تبي، قيّم تجربتك.',

  // ---- gate ----
  'gate.subtitle_default': 'عشان تحجز، تتابع مواعيدك، وتوصلك العروض — بنرسل لك كود تأكيد على واتساب.',
  'gate.mobile_label': 'رقم الجوال',
  'gate.name_ph': 'اكتب اسمك',
  'gate.err_conn': 'مشكلة في الاتصال، حاول مرة ثانية',
  'gate.send_code': 'أرسل لي الكود على واتساب',
  'gate.sent_to': 'أرسلنا كود على واتساب إلى',
  'gate.err_otp': 'الكود غلط',
  'gate.resend': 'أعد إرسال الكود',
  'gate.secure_note': 'دخول آمن بكود لمرة واحدة على واتساب — بدون كلمة مرور. حساب مضمونة واحد يشتغل في كل مكان.',


  // ---- mobile home ----
  'mhome.ask_madmona_marid': 'اسأل مارد مضمونة… يرد عليك فورًا',
  'mhome.ask': 'اسأل',
  'mhome.choose_your_section': 'اختر قسمك',
  'mhome.developer_projects_prices_of': 'مشاريع المطوّرين والأسعار والعروض',
  'mhome.have_something_to_rent_or_se': 'عندك شي تأجّره أو تبيعه؟',
  'mhome.list_it_free_in_2_minutes_we': 'أضفه مجانًا في دقيقتين — وإحنا نسوّق لك',
  'mhome.orders_favorites_wallet': 'طلباتك ومفضلتك والمحفظة',
  'mhome.add_a_listing': 'أضف إعلان',
  'mhome.start_selling_or_renting': 'ابدأ تبيع أو تؤجّر على مضمونة',
  'mhome.join_the_madmona_team': 'قدّم على فرص العمل في مضمونة',
  'mhome.access_your_account': 'ادخل على حسابك',
  'mhome.chat_with_us_now': 'كلّمنا مباشرة — رد فوري',
  'mhome.h1_a': 'دوّر على أي شي —',
  'mhome.v_business': 'بورصة رجال الأعمال',
  'about.story_p1': 'مضمونة بدأت في مصر الجديدة بفكرة وحدة: إن أي إيجار أو بيع في مصر لازم يكون مضمون للطرفين — بحماية كاملة وثقة حقيقية.',
  'about.cta_sub': 'ابدأ الحين — أجّر، اشترِ، أو احجز خدمة بحماية كاملة وبدون أي مخاطرة.',
}
