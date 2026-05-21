// src/lib/i18n/dictionary.ts
// ============================================================
// Madmona bilingual dictionary (Arabic / English).
//
// Usage:
//   const { t, lang, setLang, dir } = useT()
//   <h1>{t('home.hero.title')}</h1>
//
// Keys are dot-namespaced by surface (nav.*, home.*, common.*, ...).
// Arabic is the source-of-truth fallback: if an English key is missing,
// the Arabic value is shown instead of a raw key.
//
// To extend: add the key to BOTH `ar` and `en` blocks. Keep wording in
// Egyptian colloquial for Arabic, clean professional English for EN.
// ============================================================

export type Lang = 'ar' | 'en'

export const LANGS: Lang[] = ['ar', 'en']
export const DEFAULT_LANG: Lang = 'ar'
export const LANG_STORAGE_KEY = 'madmona_lang'
export const dirFor = (l: Lang): 'rtl' | 'ltr' => (l === 'ar' ? 'rtl' : 'ltr')

type Dict = Record<string, string>

const ar: Dict = {
  // ---- common ----
  'common.brand': 'مضمونة',
  'common.slogan': 'احنا بتوع الإيجار',
  'common.tagline': 'اللي بتأجره مضمون',
  'common.loading': 'جاري التحميل...',
  'common.search': 'دور على اللي محتاجه',
  'common.search_short': 'بحث',
  'common.back': 'رجوع',
  'common.next': 'التالي',
  'common.cancel': 'إلغاء',
  'common.confirm': 'تأكيد',
  'common.save': 'حفظ',
  'common.send': 'إرسال',
  'common.submit': 'إرسال',
  'common.close': 'إغلاق',
  'common.continue': 'كمّل',
  'common.all': 'الكل',
  'common.more': 'المزيد',
  'common.from': 'من',
  'common.to': 'إلى',
  'common.egp': 'ج.م',
  'common.per_hour': 'بالساعة',
  'common.per_day': 'باليوم',
  'common.per_week': 'بالأسبوع',
  'common.per_month': 'بالشهر',
  'common.per_event': 'مرة واحدة',
  'common.error': 'حصل خطأ، حاول تاني',
  'common.required': 'مطلوب',
  'common.optional': 'اختياري',

  // ---- nav ----
  'nav.home': 'الرئيسية',
  'nav.marketplace': 'السوق',
  'nav.rent_from_us': 'أجر مننا',
  'nav.add_listing': 'ضيف الليستنج',
  'nav.bookings': 'حجوزاتي',
  'nav.account': 'حسابي',
  'nav.login': 'تسجيل دخول',
  'nav.signup': 'حساب جديد',
  'nav.logout': 'تسجيل خروج',
  'nav.dashboard': 'لوحة التحكم',
  'nav.support': 'الدعم',
  'nav.favorites': 'المفضلة',
  'nav.menu': 'القائمة',
  'nav.account_desc': 'حجوزاتي وليستنجاتي',
  'nav.login_desc': 'عندك حساب بالفعل',
  'nav.share': 'شارك مضمونة',
  'nav.share_desc': 'ابعت الموقع لأصحابك',
  'nav.whatsapp_cta': 'واتساب · رد فوري',
  'nav.share_title': 'مضمونة - منصة الإيجار',
  'nav.share_text': 'مضمونة 🟢 — احنا بتوع الإيجار في مصر.',

  // ---- home / hero ----
  'home.hero.eyebrow': 'منصة التأجير الأولى في مصر',
  'home.hero.title': 'احنا بتوع الإيجار',
  'home.hero.subtitle': 'منصة واحدة لتأجير كل ما يمكن تأجيره — شقق، شاليهات، عربيات، كاميرات، معدات، ومساحات عمل.',
  'home.hero.cta_browse': 'اتفرّج على السوق',
  'home.hero.cta_list': 'ضيف الليستنج بتاعك',
  'home.hero.search_placeholder': 'دور على شاليه، عربية، كاميرا...',

  // ---- home / pillars ----
  'home.pillars.title': 'ليه مضمونة',
  'home.pillars.protection.title': 'حماية كاملة',
  'home.pillars.protection.desc': 'كل عملية متأمّنة للطرفين، تحقق من الهوية وتوثيق للموردين.',
  'home.pillars.payouts.title': 'دفع مستحقات سريع',
  'home.pillars.payouts.desc': 'تحصيل آمن وتحويل سريع وشفاف من غير تعقيد.',
  'home.pillars.support.title': 'دعم مستمر',
  'home.pillars.support.desc': 'فريق ودعم ذكي بيردّ خلال ثواني على مدار الساعة.',

  // ---- home / categories ----
  'home.categories.title': 'إيه اللي تقدر تأجره',
  'home.categories.rentals': 'تأجير',
  'home.categories.services': 'خدمات',
  'home.categories.hybrid': 'باقات',

  // ---- home / how it works ----
  'home.how.title': 'بتشتغل إزاي',
  'home.how.step1.title': 'دوّر واختار',
  'home.how.step1.desc': 'اتصفّح آلاف الليستنجز ولاقي اللي يناسبك.',
  'home.how.step2.title': 'احجز بأمان',
  'home.how.step2.desc': 'احجز في ثواني مع حماية كاملة على فلوسك.',
  'home.how.step3.title': 'استلم واستمتع',
  'home.how.step3.desc': 'استلم اللي أجرته وأنت مطمّن — مضمون.',

  // ---- home / cta supplier ----
  'home.supplier.title': 'عندك حاجة تأجرها؟',
  'home.supplier.desc': 'ضيف الليستنج بتاعك مجاناً، وخلي أنظمتنا تجيبلك حجوزات. بناخد نسبتنا بس لما تكسب.',
  'home.supplier.cta': 'ابدأ التأجير',

  // ---- home page (detailed) ----
  'home.cta.rent_from_us': 'أجر مننا',
  'home.news.title': 'آخر الأخبار',
  'home.news.sub': 'أخبار لحظية من أفضل المصادر المصرية والعالمية · تتجدد كل ٣ دقايق',
  'home.cats.title1': 'ابحث في',
  'home.cats.title2': 'الخدمات والإيجارات',
  'home.see_all': 'شوف الكل',
  'home.cats.empty': 'لسه مفيش فئات.',
  'home.featured.title1': 'المختار',
  'home.featured.title2': 'بعناية',
  'home.how.title1': '٣ خطوات،',
  'home.how.title2': 'حجز مضمون',
  'home.how.s1.title': 'استكشف',
  'home.how.s1.desc': 'اتصفّح الخدمات أو ابحث في فئة معينة. شوف الأسعار والصور قبل أي قرار.',
  'home.how.s2.title': 'احجز',
  'home.how.s2.desc': 'اختار الوقت اللي يناسبك واحجز فوراً. تأكيد على واتساب من صاحب الإعلان مباشرة.',
  'home.how.s3.title': 'استمتع',
  'home.how.s3.desc': 'ادفع كاش أو InstaPay. مفيش هيدن فيز. ومتأمن إنك مش هتلاقي مفاجآت.',
  'home.contact.title1': 'تواصل',
  'home.contact.title2': 'معانا',
  'home.contact.whatsapp': 'واتساب',
  'home.contact.address': '٧ شارع سليمان عَزْمي',
  'home.contact.address_sub': 'النزهة، مصر الجديدة · ٢٤/٧',
  'home.contact.rate': 'قيّمنا على جوجل',
  'home.contact.rate_sub': 'رأيك بيفرق معانا',
  'footer.tagline': 'احنا بتوع الإيجار · اللي بتأجره مضمون',
  'footer.about_link': 'عن مضمونة',
  'footer.services_link': 'خدمات مضمونة',
  'footer.privacy': 'الخصوصية',
  'footer.terms': 'الشروط',
  'footer.whatsapp': 'واتساب',
  'footer.copyright': '© 2026 مضمونة. جميع الحقوق محفوظة.',

  // ---- footer ----
  'footer.about': 'منصة تأجير كل ما يمكن تأجيره في مصر، تأسست ٢٠١٩.',
  'footer.quick_links': 'روابط سريعة',
  'footer.contact': 'تواصل',
  'footer.follow': 'تابعنا',
  'footer.rights': 'جميع الحقوق محفوظة',

  // ---- marketplace ----
  'market.title': 'السوق',
  'market.filter': 'تصفية',
  'market.sort': 'ترتيب',
  'market.results': 'نتيجة',
  'market.no_results': 'مفيش نتائج، جرّب بحث تاني',
  'market.book_now': 'احجز دلوقتي',
  'market.view': 'عرض التفاصيل',

  // ---- booking ----
  'booking.title': 'احجز',
  'booking.pricing': 'طريقة التسعير',
  'booking.date': 'تاريخ الحجز',
  'booking.from': 'من',
  'booking.to': 'إلى',
  'booking.notes': 'ملاحظات إضافية (اختياري)',
  'booking.total': 'الإجمالي',
  'booking.confirm': 'تأكيد الحجز',
  'booking.submitting': 'جاري الإرسال...',
  'booking.login_first': 'سجّل دخول الأول',
  'booking.login_desc': 'عشان تحجز، لازم تسجّل دخول أو تعمل حساب جديد.',

  // ---- auth ----
  'auth.login.title': 'تسجيل دخول',
  'auth.signup.title': 'حساب جديد',
  'auth.email': 'الإيميل',
  'auth.password': 'كلمة المرور',
  'auth.phone': 'رقم الموبايل',
  'auth.name': 'الاسم',
  'auth.no_account': 'مفيش حساب؟ اعمل حساب جديد',
  'auth.have_account': 'عندك حساب؟ سجّل دخول',
}

const en: Dict = {
  // ---- common ----
  'common.brand': 'Madmona',
  'common.slogan': 'We are the rental people',
  'common.tagline': 'Whatever you rent — guaranteed',
  'common.loading': 'Loading...',
  'common.search': 'Find what you need',
  'common.search_short': 'Search',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.save': 'Save',
  'common.send': 'Send',
  'common.submit': 'Submit',
  'common.close': 'Close',
  'common.continue': 'Continue',
  'common.all': 'All',
  'common.more': 'More',
  'common.from': 'From',
  'common.to': 'To',
  'common.egp': 'EGP',
  'common.per_hour': 'per hour',
  'common.per_day': 'per day',
  'common.per_week': 'per week',
  'common.per_month': 'per month',
  'common.per_event': 'one-time',
  'common.error': 'Something went wrong, please try again',
  'common.required': 'Required',
  'common.optional': 'Optional',

  // ---- nav ----
  'nav.home': 'Home',
  'nav.marketplace': 'Marketplace',
  'nav.rent_from_us': 'Rent from us',
  'nav.add_listing': 'Add a listing',
  'nav.bookings': 'My bookings',
  'nav.account': 'Account',
  'nav.login': 'Log in',
  'nav.signup': 'Sign up',
  'nav.logout': 'Log out',
  'nav.dashboard': 'Dashboard',
  'nav.support': 'Support',
  'nav.favorites': 'Favorites',
  'nav.menu': 'Menu',
  'nav.account_desc': 'My bookings & listings',
  'nav.login_desc': 'You already have an account',
  'nav.share': 'Share Madmona',
  'nav.share_desc': 'Send the site to your friends',
  'nav.whatsapp_cta': 'WhatsApp · instant reply',
  'nav.share_title': 'Madmona — the rental platform',
  'nav.share_text': 'Madmona 🟢 — Egypt\'s everything-rental platform.',

  // ---- home / hero ----
  'home.hero.eyebrow': "Egypt's #1 rental platform",
  'home.hero.title': 'We are the rental people',
  'home.hero.subtitle': 'One platform to rent anything — apartments, chalets, cars, cameras, equipment, and workspaces.',
  'home.hero.cta_browse': 'Browse the marketplace',
  'home.hero.cta_list': 'Add your listing',
  'home.hero.search_placeholder': 'Search for a chalet, car, camera...',

  // ---- home / pillars ----
  'home.pillars.title': 'Why Madmona',
  'home.pillars.protection.title': 'Full protection',
  'home.pillars.protection.desc': 'Every transaction is secured for both sides, with identity verification and supplier vetting.',
  'home.pillars.payouts.title': 'Fast payouts',
  'home.pillars.payouts.desc': 'Secure collection and rapid, transparent transfers — no friction.',
  'home.pillars.support.title': '24/7 support',
  'home.pillars.support.desc': 'A team and smart support replying within seconds, around the clock.',

  // ---- home / categories ----
  'home.categories.title': 'What you can rent',
  'home.categories.rentals': 'Rentals',
  'home.categories.services': 'Services',
  'home.categories.hybrid': 'Packages',

  // ---- home / how it works ----
  'home.how.title': 'How it works',
  'home.how.step1.title': 'Search & choose',
  'home.how.step1.desc': 'Browse thousands of listings and find your match.',
  'home.how.step2.title': 'Book safely',
  'home.how.step2.desc': 'Book in seconds with full protection on your money.',
  'home.how.step3.title': 'Receive & enjoy',
  'home.how.step3.desc': 'Get what you rented with total peace of mind — guaranteed.',

  // ---- home / cta supplier ----
  'home.supplier.title': 'Got something to rent out?',
  'home.supplier.desc': 'Add your listing for free and let our systems bring you bookings. We only earn when you do.',
  'home.supplier.cta': 'Start renting out',

  // ---- home page (detailed) ----
  'home.cta.rent_from_us': 'Rent from us',
  'home.news.title': 'Latest news',
  'home.news.sub': 'Real-time news from the best Egyptian & global sources · refreshes every 3 min',
  'home.cats.title1': 'Browse',
  'home.cats.title2': 'services & rentals',
  'home.see_all': 'See all',
  'home.cats.empty': 'No categories yet.',
  'home.featured.title1': 'Curated',
  'home.featured.title2': 'with care',
  'home.how.title1': '3 steps,',
  'home.how.title2': 'a guaranteed booking',
  'home.how.s1.title': 'Explore',
  'home.how.s1.desc': 'Browse services or search a category. See prices and photos before you decide.',
  'home.how.s2.title': 'Book',
  'home.how.s2.desc': 'Pick the time that suits you and book instantly. Confirmation on WhatsApp straight from the owner.',
  'home.how.s3.title': 'Enjoy',
  'home.how.s3.desc': 'Pay cash or InstaPay. No hidden fees, and no surprises — guaranteed.',
  'home.contact.title1': 'Get in',
  'home.contact.title2': 'touch',
  'home.contact.whatsapp': 'WhatsApp',
  'home.contact.address': '7 Soliman Azmy St',
  'home.contact.address_sub': 'Heliopolis, Cairo · 24/7',
  'home.contact.rate': 'Rate us on Google',
  'home.contact.rate_sub': 'Your review matters',
  'footer.tagline': 'We are the rental people · whatever you rent, guaranteed',
  'footer.about_link': 'About Madmona',
  'footer.services_link': 'Marketplace',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.whatsapp': 'WhatsApp',
  'footer.copyright': '© 2026 Madmona. All rights reserved.',

  // ---- footer ----
  'footer.about': "Egypt's everything-rental platform, founded 2019.",
  'footer.quick_links': 'Quick links',
  'footer.contact': 'Contact',
  'footer.follow': 'Follow us',
  'footer.rights': 'All rights reserved',

  // ---- marketplace ----
  'market.title': 'Marketplace',
  'market.filter': 'Filter',
  'market.sort': 'Sort',
  'market.results': 'results',
  'market.no_results': 'No results — try another search',
  'market.book_now': 'Book now',
  'market.view': 'View details',

  // ---- booking ----
  'booking.title': 'Book',
  'booking.pricing': 'Pricing',
  'booking.date': 'Booking date',
  'booking.from': 'From',
  'booking.to': 'To',
  'booking.notes': 'Additional notes (optional)',
  'booking.total': 'Total',
  'booking.confirm': 'Confirm booking',
  'booking.submitting': 'Submitting...',
  'booking.login_first': 'Log in first',
  'booking.login_desc': 'To book, you need to log in or create a new account.',

  // ---- auth ----
  'auth.login.title': 'Log in',
  'auth.signup.title': 'Create account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.phone': 'Mobile number',
  'auth.name': 'Name',
  'auth.no_account': "No account? Create one",
  'auth.have_account': 'Have an account? Log in',
}

export const translations: Record<Lang, Dict> = { ar, en }
