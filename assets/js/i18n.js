/* ==========================================================================
   Automatic language (EN default / AR for Arabic devices)
   - Detects the device/browser language. If it is Arabic, the internal
     content is translated and the layout is switched to RTL.
   - The loading screen is intentionally NOT translated (it lives outside
     <main>, which is the only tree we walk).
   ========================================================================== */
(function () {
  // Manual override for testing / user choice:  ?lang=ar  or  ?lang=en  (remembered)
  var saved = null;
  try {
    var ov = new URLSearchParams(location.search).get('lang');
    if (ov) localStorage.setItem('site-lang', ov);
    saved = ov || localStorage.getItem('site-lang');
  } catch (e) { /* ignore */ }

  // Detect Arabic from every signal we can: the browser language list AND the
  // OS locale exposed through Intl (this one follows the device language/region
  // even when the browser's own language list is still English).
  var list = [];
  if (navigator.languages && navigator.languages.length) list = list.concat(navigator.languages);
  if (navigator.language) list.push(navigator.language);
  if (navigator.userLanguage) list.push(navigator.userLanguage);
  try { list.push(Intl.DateTimeFormat().resolvedOptions().locale); } catch (e) { /* ignore */ }
  try { list.push(Intl.NumberFormat().resolvedOptions().locale); } catch (e) { /* ignore */ }
  var detected = list.some(function (l) { return /^ar\b|^ar[-_]/i.test(l || '') || /^ar$/i.test(l || ''); });

  var isAr = saved ? (saved === 'ar') : detected;
  if (!isAr) return; // English is the default — nothing to do

  /* English (normalized, single-spaced) -> Arabic */
  var T = {
    /* ---- nav / side menu / UI ---- */
    "Navigation": "التنقّل",
    "Home": "الرئيسية",
    "About Us": "من نحن",
    "Our Services": "خدماتنا",
    "Testimonials": "آراء العملاء",
    "Contact Us": "تواصل معنا",
    "Contact": "تواصل",
    "Socials": "التواصل الاجتماعي",
    "Menu": "القائمة",
    "View": "عرض",
    "Next case": "الخدمة التالية",
    "Next service": "الخدمة التالية",
    "View service": "عرض الخدمة",
    "WhatsApp": "واتساب",
    "Instagram": "إنستغرام",
    "Tiktok": "تيك توك",
    "Facebook": "فيسبوك",
    "Youtube": "يوتيوب",
    "LinkedIn": "لينكدإن",

    /* ---- hero stats ---- */
    "Years of Experience": "سنوات الخبرة",
    "Happy Clients": "عملاء سعداء",
    "Projects Delivered": "مشاريع منجزة",

    /* ---- about ---- */
    "About us": "من نحن",
    "Most brands don't fail because of bad ideas. They fail because no one ever shaped the idea right.":
      "معظم العلامات التجارية لا تفشل بسبب الأفكار السيّئة، بل تفشل لأن أحداً لم يصُغ الفكرة بالشكل الصحيح.",
    "We are a Saudi digital growth agency that turns chaos into clarity. We don't offer scattered services — we build one connected system that grows your brand with purpose.":
      "نحن وكالة نمو رقمي سعودية تحوّل الفوضى إلى وضوح. لا نقدّم خدمات متفرّقة، بل نبني نظاماً واحداً متكاملاً ينمّي علامتك التجارية بهدف واضح.",
    "Marketing, branding, websites, SEO, ads — everything works together to make your brand not just visible… but unmistakable.":
      "التسويق، الهوية، المواقع، تحسين محركات البحث، الإعلانات — كل شيء يعمل معاً ليجعل علامتك ليست مرئية فحسب… بل لا تُنسى.",
    "From scattered ideas to a brand people instantly understand.":
      "من أفكار متناثرة إلى علامة يفهمها الناس فوراً.",
    "From noise to a clear identity that stands out.":
      "من الضجيج إلى هوية واضحة تتميّز.",
    "From zero to a brand that feels complete, alive, and ready.":
      "من الصفر إلى علامة تبدو مكتملة، حيّة، وجاهزة.",

    /* ---- services (section + cards, shared with detail pages) ---- */
    "We help businesses build a strong digital presence and turn it into measurable results through integrated solutions that combine design, marketing, and development.":
      "نساعد الشركات على بناء حضور رقمي قوي وتحويله إلى نتائج قابلة للقياس عبر حلول متكاملة تجمع بين التصميم والتسويق والتطوير.",
    "Website Design & Development": "تصميم وتطوير المواقع",
    "We design and develop fast, responsive, and SEO-friendly websites that deliver a professional user experience and help your business achieve its goals.":
      "نصمّم ونطوّر مواقع سريعة ومتجاوبة وصديقة لمحركات البحث، تقدّم تجربة استخدام احترافية وتساعد عملك على تحقيق أهدافه.",
    "Search Engine Optimization (SEO)": "تحسين محركات البحث (SEO)",
    "We improve your website's visibility in search results and attract qualified traffic from potential customers actively looking for your products or services.":
      "نحسّن ظهور موقعك في نتائج البحث ونجذب زيارات مؤهّلة من عملاء محتملين يبحثون فعلياً عن منتجاتك أو خدماتك.",
    "Advertising Campaign Management": "إدارة الحملات الإعلانية",
    "We plan, launch, and optimize advertising campaigns across Google and social media platforms to maximize performance and achieve the highest possible return on investment.":
      "نخطّط ونطلق ونحسّن الحملات الإعلانية عبر جوجل ومنصات التواصل الاجتماعي لتعظيم الأداء وتحقيق أعلى عائد ممكن على الاستثمار.",
    "Brand Identity Development": "تطوير الهوية التجارية",
    "We create complete brand identities that reflect your business personality and differentiate you from competitors, from brand strategy to visual assets and communication style.":
      "نبني هويات تجارية متكاملة تعكس شخصية عملك وتميّزك عن المنافسين، من استراتيجية العلامة إلى العناصر البصرية وأسلوب التواصل.",
    "Social Media Management & Content Creation": "إدارة وسائل التواصل وصناعة المحتوى",
    "We transform your social media presence into a powerful growth channel through strategic content, audience engagement, and consistent brand communication.":
      "نحوّل حضورك على وسائل التواصل إلى قناة نمو قوية عبر محتوى استراتيجي، وتفاعل مع الجمهور، وتواصل ثابت للعلامة.",
    "E-commerce & Custom Systems Development": "تطوير المتاجر والأنظمة المخصّصة",
    "We develop e-commerce stores and tailored digital systems that streamline operations, improve efficiency, and deliver better experiences for your customers.":
      "نطوّر متاجر إلكترونية وأنظمة رقمية مخصّصة تبسّط العمليات، وترفع الكفاءة، وتقدّم تجارب أفضل لعملائك.",
    "Details": "التفاصيل",
    "Let's bring your idea to life": "لنحوّل فكرتك إلى واقع",

    /* ---- testimonials ---- */
    "Real words from people who trusted us with their vision.":
      "كلمات حقيقية من أشخاص ائتمنونا على رؤيتهم.",
    "Their journey, in their own voice.": "رحلتهم، بكلماتهم.",
    "\"We were just a name with no personality. They built our whole identity and gave our brand one consistent voice. People finally recognize us.\"":
      "«كنّا مجرّد اسم بلا شخصية. بنوا هويتنا كاملة وأعطوا علامتنا صوتاً واحداً متّسقاً. أخيراً صار الناس يعرفوننا.»",
    "Omar Al-Azizi": "عمر العزيزي",
    "Owner, Lamsa": "المالك، لمسة",
    "\"Our old site was slow and brought zero leads. They rebuilt it from scratch — fast, clean, and truly us. Traffic doubled in two months.\"":
      "«كان موقعنا القديم بطيئاً ولا يجلب أي عملاء. أعادوا بناءه من الصفر — سريع، أنيق، ويعبّر عنّا حقاً. تضاعفت الزيارات خلال شهرين.»",
    "Sarah Al-Otaibi": "سارة العتيبي",
    "Founder, Anaqa Store": "المؤسِّسة، متجر أناقة",
    "\"We'd wasted budget on ads before with no results. zero2one knew exactly where every riyal should go. Our ROI more than doubled.\"":
      "«أهدرنا ميزانية على الإعلانات سابقاً بلا نتائج. zero2one عرفت بالضبط أين يذهب كل ريال. تضاعف عائد استثمارنا وأكثر.»",
    "Fahad Al-Mutairi": "فهد المطيري",
    "Marketing Manager, Mada Contracting": "مدير التسويق، مدى للمقاولات",

    /* ---- footer ---- */
    "Every great journey": "كل رحلة عظيمة",
    "starts with one step": "تبدأ بخطوة واحدة",
    "Get in touch": "تواصل معنا",
    "7th Floor, Computer Complex, Al Olaya, Riyadh": "الرياض - العليا العام - مجمع الكمبيوترات الدور السابع",
    "Version": "الإصدار",
    "2026 © Edition": "2026 © إصدار",
    "zero2one. All rights reserved.": "zero2one. جميع الحقوق محفوظة.",
    "Local time": "التوقيت المحلي",

    /* ---- FAQ (home) ---- */
    "FAQ": "الأسئلة الشائعة",
    "Frequently asked questions": "أسئلة شائعة",
    "What does ZERO 2 ONE do?": "ماذا تقدّم ZERO 2 ONE؟",
    "ZERO 2 ONE is a Riyadh-based digital marketing agency. We take brands from zero to one with website design and development, SEO, advertising campaign management, brand identity, social media management, and e-commerce development.": "ZERO 2 ONE وكالة تسويق رقمي مقرّها الرياض. نأخذ العلامات التجارية من الصفر إلى الواحد عبر تصميم وتطوير المواقع، وتحسين محرّكات البحث، وإدارة الحملات الإعلانية، والهوية البصرية، وإدارة وسائل التواصل الاجتماعي، وتطوير المتاجر الإلكترونية.",
    "What services does ZERO 2 ONE offer?": "ما الخدمات التي تقدّمها ZERO 2 ONE؟",
    "Six core services: website design and development, search engine optimization (SEO), advertising campaign management, brand identity development, social media management and content creation, and e-commerce development and custom systems.": "ست خدمات أساسية: تصميم وتطوير المواقع، وتحسين محرّكات البحث (SEO)، وإدارة الحملات الإعلانية، وتطوير الهوية البصرية، وإدارة وسائل التواصل الاجتماعي وصناعة المحتوى، وتطوير المتاجر الإلكترونية والأنظمة المخصّصة.",
    "Where is ZERO 2 ONE located?": "أين يقع مقرّ ZERO 2 ONE؟",
    "We are based in Al Olaya, Riyadh, Saudi Arabia (7th Floor, Computer Complex), and work with brands across Saudi Arabia and the wider GCC.": "مقرّنا في العليا، الرياض، المملكة العربية السعودية (الدور السابع، مجمع الكمبيوترات)، ونعمل مع العلامات التجارية في جميع أنحاء السعودية ومنطقة الخليج.",
    "How can I contact ZERO 2 ONE?": "كيف يمكنني التواصل مع ZERO 2 ONE؟",
    "Call or message us on WhatsApp at +966 53 030 7054, or email info@zero2one.sa. We usually reply the same business day.": "اتصل بنا أو راسلنا عبر واتساب على الرقم +966 53 030 7054، أو عبر البريد info@zero2one.sa. نردّ عادةً في نفس يوم العمل.",
    "Does ZERO 2 ONE work with businesses outside Riyadh?": "هل تعمل ZERO 2 ONE مع شركات خارج الرياض؟",
    "Yes. We serve clients across Saudi Arabia and the GCC, working both remotely and on-site depending on the project.": "نعم. نخدم عملاء في جميع أنحاء السعودية ومنطقة الخليج، عن بُعد أو في الموقع بحسب المشروع.",
    "How do you approach a new project?": "كيف تبدؤون مشروعاً جديداً؟",
    "We start with business discovery and market analysis, then move to strategy, design and build, launch, and continuous optimization — a clear path from zero to one.": "نبدأ باكتشاف أهداف العمل وتحليل السوق، ثم ننتقل إلى الاستراتيجية والتصميم والتنفيذ، فالإطلاق، ثم التحسين المستمر — مسار واضح من الصفر إلى الواحد.",

    /* ---- service detail pages: shared labels ---- */
    "What's Included?": "ماذا يتضمّن؟",
    "Our Process": "آلية عملنا",
    "Expected Outcome": "النتيجة المتوقّعة",

    /* ===== Website Design page ===== */
    "Turn Your Website Into a Real Growth Engine": "حوّل موقعك إلى محرّك نموّ حقيقي",
    "Your website is more than an online presence. It's where customers form their first impression, evaluate your credibility, and decide whether to move forward with your business.":
      "موقعك أكثر من مجرّد حضور إلكتروني. إنه المكان الذي يكوّن فيه العملاء انطباعهم الأول، ويقيّمون مصداقيتك، ويقرّرون ما إذا كانوا سيمضون قدماً مع عملك.",
    "Your website is more than an online presence.": "موقعك أكثر من مجرّد حضور إلكتروني.",
    "It's where customers form their first impression, evaluate your credibility, and decide whether to move forward with your business.":
      "إنه المكان الذي يكوّن فيه العملاء انطباعهم الأول، ويقيّمون مصداقيتك، ويقرّرون ما إذا كانوا سيمضون قدماً مع عملك.",
    "At Zero to One, we design and develop professional websites for companies, e-commerce businesses, and growing brands in Saudi Arabia—built around performance, user experience, and business outcomes.":
      "في Zero to One، نصمّم ونطوّر مواقع احترافية للشركات والمتاجر الإلكترونية والعلامات النامية في السعودية—مبنية حول الأداء وتجربة المستخدم ونتائج الأعمال.",
    "Our goal is not simply to create visually appealing websites, but to build digital experiences that communicate value clearly, strengthen trust, and convert visitors into customers.":
      "هدفنا ليس مجرّد إنشاء مواقع جذّابة بصرياً، بل بناء تجارب رقمية تنقل القيمة بوضوح، وتعزّز الثقة، وتحوّل الزوّار إلى عملاء.",
    "Corporate Website Design": "تصميم مواقع الشركات",
    "Professional business websites designed to present your services clearly and strengthen your brand positioning.":
      "مواقع أعمال احترافية مصمّمة لعرض خدماتك بوضوح وتعزيز مكانة علامتك.",
    "High-Converting Landing Pages": "صفحات هبوط عالية التحويل",
    "Landing pages built with conversion-focused structure to generate leads, increase inquiries, and support campaign performance.":
      "صفحات هبوط مبنية بهيكل يركّز على التحويل لتوليد العملاء، وزيادة الاستفسارات، ودعم أداء الحملات.",
    "E-commerce Development": "تطوير المتاجر الإلكترونية",
    "Complete online stores designed to deliver smooth purchasing experiences and efficient product management.":
      "متاجر إلكترونية متكاملة مصمّمة لتقديم تجارب شراء سلسة وإدارة فعّالة للمنتجات.",
    "Custom Dashboards & Systems": "لوحات تحكّم وأنظمة مخصّصة",
    "Tailored digital systems and admin panels that improve internal operations and business workflows.":
      "أنظمة رقمية ولوحات إدارة مخصّصة تحسّن العمليات الداخلية وسير العمل.",
    "User Experience Optimization (UX)": "تحسين تجربة المستخدم (UX)",
    "Enhancing navigation, usability, and customer journeys to improve engagement and conversion.":
      "تحسين التنقّل وسهولة الاستخدام ورحلات العملاء لرفع التفاعل والتحويل.",
    "SEO-Ready Development": "تطوير جاهز لمحركات البحث",
    "Technical website setup built to support visibility on search engines and long-term organic growth.":
      "إعداد تقني للموقع يدعم الظهور في محركات البحث والنمو العضوي طويل الأمد.",
    "Analytics & Tracking Integration": "تكامل التحليلات والتتبّع",
    "Implementation of measurement tools to monitor user behavior and make data-driven decisions.":
      "تطبيق أدوات القياس لمراقبة سلوك المستخدم واتخاذ قرارات مبنية على البيانات.",
    "Business Discovery": "استكشاف العمل",
    "Audience & Market Analysis": "تحليل الجمهور والسوق",
    "UX & Structure Planning": "تخطيط التجربة والبنية",
    "Development & Integrations": "التطوير والتكاملات",
    "Testing & Launch": "الاختبار والإطلاق",
    "Continuous Optimization": "تحسين مستمر",
    "A faster, clearer, and more effective website built to support business growth and customer acquisition.":
      "موقع أسرع وأوضح وأكثر فعّالية، مبني لدعم نمو العمل واكتساب العملاء.",

    /* ===== SEO page ===== */
    "Make Customers Find You When They're Already Searching": "اجعل العملاء يجدونك وهم يبحثون فعلاً",
    "Having a great website without visibility in search results is like opening a branch where no one passes by.":
      "امتلاك موقع رائع دون ظهور في نتائج البحث أشبه بافتتاح فرع لا يمرّ به أحد.",
    "At Zero to One, SEO is not just about rankings—it's about building a long-term growth channel that attracts qualified visitors with real intent to engage, purchase, or request your services.":
      "في Zero to One، تحسين محركات البحث ليس مجرّد ترتيب—بل بناء قناة نموّ طويلة الأمد تجذب زواراً مؤهّلين لديهم نيّة حقيقية للتفاعل أو الشراء أو طلب خدماتك.",
    "We build search strategies that strengthen visibility, improve authority, and turn search traffic into measurable business opportunities.":
      "نبني استراتيجيات بحث تعزّز الظهور، وترفع المصداقية، وتحوّل زيارات البحث إلى فرص تجارية قابلة للقياس.",
    "Website & Competitor Analysis": "تحليل الموقع والمنافسين",
    "Evaluate your current performance, identify opportunities, and benchmark against competitors.":
      "تقييم أدائك الحالي، وتحديد الفرص، والمقارنة بالمنافسين.",
    "Keyword Research & Strategy": "بحث الكلمات المفتاحية والاستراتيجية",
    "Discover high-value search terms based on customer intent and business potential.":
      "اكتشاف عبارات بحث عالية القيمة بناءً على نيّة العميل وإمكانات العمل.",
    "On-Page Optimization": "تحسين الصفحات الداخلية",
    "Improve website pages and content structure to increase visibility and conversion.":
      "تحسين صفحات الموقع وبنية المحتوى لزيادة الظهور والتحويل.",
    "SEO Content Development": "تطوير محتوى محسّن للبحث",
    "Create search-focused content that builds trust and attracts qualified traffic.":
      "إنشاء محتوى موجّه للبحث يبني الثقة ويجذب زيارات مؤهّلة.",
    "Technical SEO Optimization": "تحسين السيو التقني",
    "Improve speed, indexing, website architecture, and technical performance.":
      "تحسين السرعة والفهرسة وبنية الموقع والأداء التقني.",
    "Local SEO Enhancement": "تعزيز السيو المحلي",
    "Strengthen local search presence and connect with nearby customers.":
      "تقوية الحضور في البحث المحلي والتواصل مع العملاء القريبين.",
    "Google Business Profile Optimization": "تحسين ملف نشاطك على جوجل",
    "Set up and optimize your business profile to improve credibility and local discoverability.":
      "إعداد وتحسين ملف نشاطك التجاري لرفع المصداقية وسهولة الاكتشاف محلياً.",
    "Reporting & Performance Tracking": "التقارير وتتبّع الأداء",
    "Provide measurable reporting and continuous recommendations for growth.":
      "تقديم تقارير قابلة للقياس وتوصيات مستمرة للنمو.",
    "Current Performance Audit": "تدقيق الأداء الحالي",
    "Market & Competitor Research": "بحث السوق والمنافسين",
    "SEO Strategy Development": "تطوير استراتيجية السيو",
    "Technical & Content Execution": "التنفيذ التقني والمحتوى",
    "Monitoring & Continuous Optimization": "المراقبة والتحسين المستمر",
    "Higher visibility, more qualified traffic, and sustainable growth driven by organic search.":
      "ظهور أعلى، زيارات أكثر تأهيلاً، ونمو مستدام مدفوع بالبحث العضوي.",

    /* ===== Advertising page ===== */
    "We Don't Just Run Ads — We Build Campaigns That Deliver Results":
      "نحن لا ندير إعلانات فحسب — بل نبني حملات تحقّق النتائج",
    "Successful advertising does not start with budget size. It starts with understanding your audience, delivering the right message, and reaching people at the right moment.":
      "الإعلان الناجح لا يبدأ بحجم الميزانية، بل يبدأ بفهم جمهورك، وإيصال الرسالة الصحيحة، والوصول إلى الناس في اللحظة المناسبة.",
    "At Zero to One, we manage advertising campaigns with a growth mindset—not a spending mindset. Our approach focuses on turning marketing investment into measurable business opportunities through data-driven decisions, audience insights, and continuous optimization.":
      "في Zero to One، ندير الحملات الإعلانية بعقلية النمو—لا بعقلية الإنفاق. نركّز على تحويل الاستثمار التسويقي إلى فرص تجارية قابلة للقياس عبر قرارات مبنية على البيانات، ورؤى عن الجمهور، وتحسين مستمر.",
    "Whether your goal is increasing sales, generating leads, building brand awareness, or expanding into new markets, we create campaigns designed around performance and measurable outcomes.":
      "سواء كان هدفك زيادة المبيعات، أو توليد العملاء، أو بناء الوعي بالعلامة، أو التوسّع في أسواق جديدة، نصمّم حملات مبنية على الأداء والنتائج القابلة للقياس.",
    "Campaign Strategy Development": "تطوير استراتيجية الحملة",
    "Define objectives, KPIs, customer journeys, and advertising plans aligned with business goals.":
      "تحديد الأهداف ومؤشرات الأداء ورحلات العملاء وخطط الإعلان المتوافقة مع أهداف العمل.",
    "Audience Research & Targeting": "بحث الجمهور والاستهداف",
    "Analyze customer behavior, interests, demographics, and opportunities to reach high-intent audiences.":
      "تحليل سلوك العملاء واهتماماتهم وبياناتهم الديموغرافية والفرص للوصول إلى جمهور عالي النيّة.",
    "Ad Messaging & Creative Direction": "رسائل الإعلان والتوجيه الإبداعي",
    "Develop persuasive ad messaging and content designed to increase engagement and conversions.":
      "تطوير رسائل ومحتوى إعلاني مقنع مصمّم لزيادة التفاعل والتحويلات.",
    "Google Ads Management": "إدارة إعلانات جوجل",
    "Launch and manage search campaigns, display campaigns, remarketing, and performance-focused advertising.":
      "إطلاق وإدارة حملات البحث والعرض وإعادة الاستهداف والإعلان المركّز على الأداء.",
    "Social Media Advertising": "إعلانات وسائل التواصل",
    "Manage campaigns across platforms including Instagram, Snapchat, TikTok, and other relevant channels.":
      "إدارة الحملات عبر منصات تشمل إنستغرام وسناب شات وتيك توك وقنوات أخرى ذات صلة.",
    "Cost Optimization & Performance Improvement": "تحسين التكلفة ورفع الأداء",
    "Continuously monitor and improve campaign efficiency to maximize return on ad spend.":
      "مراقبة وتحسين كفاءة الحملة باستمرار لتعظيم العائد على الإنفاق الإعلاني.",
    "Testing & Conversion Optimization": "الاختبار وتحسين التحويل",
    "Run structured testing across creatives, audiences, and landing experiences to improve outcomes.":
      "إجراء اختبارات منظّمة عبر التصاميم والجماهير وتجارب الهبوط لتحسين النتائج.",
    "Reporting & Insights": "التقارير والرؤى",
    "Provide transparent reporting with actionable insights and measurable performance indicators.":
      "تقديم تقارير شفّافة مع رؤى قابلة للتنفيذ ومؤشرات أداء قابلة للقياس.",
    "Define Business Objectives": "تحديد أهداف العمل",
    "Market & Audience Research": "بحث السوق والجمهور",
    "Campaign Planning & Launch": "تخطيط الحملة وإطلاقها",
    "Performance Analysis & Scaling": "تحليل الأداء والتوسّع",
    "Smarter campaigns, stronger performance, lower acquisition costs, and sustainable business growth.":
      "حملات أذكى، وأداء أقوى، وتكاليف اكتساب أقل، ونمو تجاري مستدام.",

    /* ===== Brand Identity page ===== */
    "Build a Brand People Recognize, Remember, and Choose":
      "ابنِ علامة يتعرّف عليها الناس، ويتذكّرونها، ويختارونها",
    "A brand identity is more than a logo or a color palette. It is how customers perceive your business, the impression they form before engaging with you, and the reason they remember you among many alternatives.":
      "الهوية التجارية أكثر من شعار أو لوحة ألوان. إنها كيف يرى العملاء عملك، والانطباع الذي يكوّنونه قبل التعامل معك، والسبب الذي يجعلهم يتذكّرونك بين بدائل كثيرة.",
    "A brand identity is more than a logo or a color palette.": "الهوية التجارية أكثر من شعار أو لوحة ألوان.",
    "It is how customers perceive your business, the impression they form before engaging with you, and the reason they remember you among many alternatives.":
      "إنها كيف يرى العملاء عملك، والانطباع الذي يكوّنونه قبل التعامل معك، والسبب الذي يجعلهم يتذكّرونك بين بدائل كثيرة.",
    "At Zero to One, we create brand identities that start from strategy before design. We take the time to understand your business, audience, positioning, and ambitions—then transform that foundation into a distinctive and scalable brand experience.":
      "في Zero to One، نبني هويات تبدأ من الاستراتيجية قبل التصميم. نأخذ الوقت لفهم عملك وجمهورك وموقعك وطموحاتك—ثم نحوّل هذا الأساس إلى تجربة علامة مميّزة وقابلة للتوسّع.",
    "Our goal is to build brands that do more than look professional—they create trust, connection, and long-term recognition.":
      "هدفنا بناء علامات تتجاوز المظهر الاحترافي—تصنع الثقة والتواصل والتميّز طويل الأمد.",
    "Brand Strategy Development": "تطوير استراتيجية العلامة",
    "Define the brand foundation through vision, mission, values, positioning, and audience understanding.":
      "تحديد أساس العلامة عبر الرؤية والرسالة والقيم والموقع وفهم الجمهور.",
    "Logo Design": "تصميم الشعار",
    "Create a distinctive logo that reflects the personality and direction of the business.":
      "إنشاء شعار مميّز يعكس شخصية العمل واتجاهه.",
    "Visual Identity System": "نظام الهوية البصرية",
    "Develop a complete visual language including design styles, supporting elements, and usage standards.":
      "تطوير لغة بصرية متكاملة تشمل أنماط التصميم والعناصر المساندة ومعايير الاستخدام.",
    "Color & Typography Selection": "اختيار الألوان والخطوط",
    "Build a cohesive visual system that strengthens recognition and consistency.":
      "بناء نظام بصري متماسك يعزّز التميّز والاتّساق.",
    "Brand Personality & Tone of Voice": "شخصية العلامة ونبرة الصوت",
    "Define communication style, messaging principles, and the way the brand speaks to its audience.":
      "تحديد أسلوب التواصل ومبادئ الرسائل والطريقة التي تخاطب بها العلامة جمهورها.",
    "Brand Guidelines Creation": "إنشاء دليل العلامة",
    "Prepare a comprehensive brand manual to ensure consistency across all touchpoints.":
      "إعداد دليل شامل للعلامة لضمان الاتّساق عبر جميع نقاط التواصل.",
    "Social Media Templates": "قوالب وسائل التواصل",
    "Design flexible templates that support a professional and unified visual presence.":
      "تصميم قوالب مرنة تدعم حضوراً بصرياً احترافياً وموحّداً.",
    "Digital & Print Brand Applications": "تطبيقات العلامة الرقمية والمطبوعة",
    "Deliver brand assets optimized for websites, presentations, marketing materials, and printed collateral.":
      "تسليم أصول العلامة محسّنة للمواقع والعروض والمواد التسويقية والمطبوعات.",
    "Brand Discovery & Vision Alignment": "استكشاف العلامة ومواءمة الرؤية",
    "Brand Strategy Definition": "تحديد استراتيجية العلامة",
    "Identity Design & Development": "تصميم وتطوير الهوية",
    "Guidelines & Applications": "الدليل والتطبيقات",
    "Final Delivery & Activation": "التسليم النهائي والتفعيل",
    "A clear, consistent, and scalable identity that strengthens recognition, builds trust, and positions your business for long-term growth.":
      "هوية واضحة ومتّسقة وقابلة للتوسّع تعزّز التميّز، وتبني الثقة، وتهيّئ عملك للنمو طويل الأمد.",

    /* ===== Social Media page ===== */
    "We Don't Just Build Presence — We Build Connections That Make People Choose You":
      "نحن لا نبني حضوراً فحسب — بل نبني روابط تجعل الناس يختارونك",
    "Being active on social media is not about posting every day or following trends. Real impact happens when your audience understands who you are, what you offer, and why they should trust your brand.":
      "النشاط على وسائل التواصل لا يعني النشر كل يوم أو ملاحقة الترندات. التأثير الحقيقي يحدث حين يفهم جمهورك من أنت، وماذا تقدّم، ولماذا عليه أن يثق بعلامتك.",
    "Being active on social media is not about posting every day or following trends.":
      "النشاط على وسائل التواصل لا يعني النشر كل يوم أو ملاحقة الترندات.",
    "Real impact happens when your audience understands who you are, what you offer, and why they should trust your brand.":
      "التأثير الحقيقي يحدث حين يفهم جمهورك من أنت، وماذا تقدّم، ولماذا عليه أن يثق بعلامتك.",
    "At Zero to One, we manage social media through a strategic approach that combines content, branding, and marketing to achieve measurable business goals. We create content designed not only to attract attention, but to build trust, increase engagement, and convert audiences into customers.":
      "في Zero to One، ندير وسائل التواصل عبر منهج استراتيجي يجمع بين المحتوى والهوية والتسويق لتحقيق أهداف تجارية قابلة للقياس. نصنع محتوى لا يجذب الانتباه فقط، بل يبني الثقة، ويزيد التفاعل، ويحوّل الجمهور إلى عملاء.",
    "Our focus is not content for visibility alone—it's content that supports sustainable growth.":
      "تركيزنا ليس على محتوى للظهور وحده—بل محتوى يدعم النمو المستدام.",
    "Content Strategy Development": "تطوير استراتيجية المحتوى",
    "Build a content plan aligned with business goals, audience behavior, and brand positioning.":
      "بناء خطة محتوى متوافقة مع أهداف العمل وسلوك الجمهور وموقع العلامة.",
    "Social Media Account Management": "إدارة حسابات التواصل",
    "Manage and organize digital presence across platforms to maintain consistency and growth.":
      "إدارة وتنظيم الحضور الرقمي عبر المنصات للحفاظ على الاتّساق والنمو.",
    "Marketing & Sales Copywriting": "كتابة محتوى التسويق والمبيعات",
    "Create compelling messaging that builds engagement and supports conversion objectives.":
      "إنشاء رسائل مقنعة تبني التفاعل وتدعم أهداف التحويل.",
    "Visual Content Design": "تصميم المحتوى البصري",
    "Produce branded visual assets that strengthen recognition and elevate presentation quality.":
      "إنتاج أصول بصرية بهوية العلامة تعزّز التميّز وترفع جودة العرض.",
    "Reels & Campaign Concept Development": "تطوير الريلز ومفاهيم الحملات",
    "Develop short-form and interactive content ideas that improve reach and audience engagement.":
      "تطوير أفكار محتوى قصير وتفاعلي يحسّن الوصول وتفاعل الجمهور.",
    "Publishing & Community Coordination": "النشر وإدارة المجتمع",
    "Manage publishing schedules and ensure content execution remains consistent.":
      "إدارة جداول النشر وضمان بقاء تنفيذ المحتوى متّسقاً.",
    "Brand Voice Development": "تطوير صوت العلامة",
    "Define communication style and messaging principles to strengthen audience connection.":
      "تحديد أسلوب التواصل ومبادئ الرسائل لتقوية الارتباط بالجمهور.",
    "Performance Analysis & Optimization": "تحليل الأداء وتحسينه",
    "Track content performance and continuously improve strategy based on insights and results.":
      "تتبّع أداء المحتوى وتحسين الاستراتيجية باستمرار بناءً على الرؤى والنتائج.",
    "Business & Audience Discovery": "استكشاف العمل والجمهور",
    "Monthly Planning & Production": "التخطيط والإنتاج الشهري",
    "Design & Publishing": "التصميم والنشر",
    "Analysis & Continuous Improvement": "التحليل والتحسين المستمر",
    "A stronger digital presence, clearer brand communication, and an engaged audience that drives long-term business growth.":
      "حضور رقمي أقوى، وتواصل أوضح للعلامة، وجمهور متفاعل يقود نمو العمل طويل الأمد.",

    /* ===== E-commerce page ===== */
    "Build Digital Systems That Support Growth — Not Just Online Presence":
      "ابنِ أنظمة رقمية تدعم النمو — لا مجرّد حضور إلكتروني",
    "Some businesses need more than a website. They need digital systems that streamline operations, organize workflows, and create better customer experiences.":
      "بعض الأعمال تحتاج أكثر من موقع. تحتاج أنظمة رقمية تبسّط العمليات، وتنظّم سير العمل، وتصنع تجارب أفضل للعملاء.",
    "At Zero to One, we develop e-commerce platforms and custom systems designed to improve efficiency, simplify management, and support business scalability.":
      "في Zero to One، نطوّر منصات تجارة إلكترونية وأنظمة مخصّصة مصمّمة لرفع الكفاءة، وتبسيط الإدارة، ودعم قابلية التوسّع.",
    "Whether you need an online store, booking platform, operational dashboard, or a fully customized solution, we build systems tailored to your business—not generic templates.":
      "سواء كنت تحتاج متجراً إلكترونياً، أو منصة حجز، أو لوحة تشغيل، أو حلاً مخصّصاً بالكامل، نبني أنظمة مفصّلة على عملك—لا قوالب جاهزة.",
    "E-Commerce Development": "تطوير التجارة الإلكترونية",
    "Build professional online stores designed to improve product presentation, purchasing experience, and order management.":
      "بناء متاجر إلكترونية احترافية لتحسين عرض المنتجات، وتجربة الشراء، وإدارة الطلبات.",
    "Custom Dashboard Development": "تطوير لوحات تحكّم مخصّصة",
    "Create flexible admin panels that simplify operations and provide better control over business processes.":
      "إنشاء لوحات إدارة مرنة تبسّط العمليات وتمنح تحكّماً أفضل في عمليات العمل.",
    "Booking & Order Management Systems": "أنظمة الحجوزات وإدارة الطلبات",
    "Develop solutions that automate reservations, requests, and customer workflows.":
      "تطوير حلول تؤتمت الحجوزات والطلبات وسير عمل العملاء.",
    "Payment Gateway Integration": "ربط بوابات الدفع",
    "Enable secure and seamless payment experiences across digital platforms.":
      "تمكين تجارب دفع آمنة وسلسة عبر المنصات الرقمية.",
    "Third-Party Integrations": "تكاملات الطرف الثالث",
    "Connect systems with shipping providers, CRM tools, operational software, and external services.":
      "ربط الأنظمة بمزوّدي الشحن وأدوات إدارة العملاء وبرامج التشغيل والخدمات الخارجية.",
    "User & Purchase Experience Optimization": "تحسين تجربة المستخدم والشراء",
    "Improve usability and simplify customer journeys to increase satisfaction and business outcomes.":
      "تحسين سهولة الاستخدام وتبسيط رحلات العملاء لزيادة الرضا ونتائج العمل.",
    "Custom Software Solutions": "حلول برمجية مخصّصة",
    "Develop tailored digital products built around your operational and growth requirements.":
      "تطوير منتجات رقمية مفصّلة على متطلبات تشغيلك ونموّك.",
    "Scalability & Future Expansion Readiness": "الجاهزية للتوسّع المستقبلي",
    "Build flexible architectures that support future upgrades and business expansion.":
      "بناء بُنى مرنة تدعم التحديثات المستقبلية وتوسّع العمل.",
    "Business & Operations Discovery": "استكشاف العمل والعمليات",
    "Customer Journey & Workflow Analysis": "تحليل رحلة العميل وسير العمل",
    "Solution Architecture & Planning": "هندسة الحل والتخطيط",
    "Development & Testing": "التطوير والاختبار",
    "Launch & Integration": "الإطلاق والتكامل",
    "Ongoing Optimization": "تحسين مستمر",
    "Smarter operations, stronger customer experiences, and scalable digital infrastructure built for long-term growth.":
      "عمليات أذكى، وتجارب عملاء أقوى، وبنية رقمية قابلة للتوسّع مبنية للنمو طويل الأمد."
  };

  /* elements made of multiple spans / line breaks — translate the whole element */
  var SPECIAL = [
    { sel: '.home-header h4', html: '<span>وكالة</span> تسويق' },
    { sel: '.footer .footer-hero-text h2', html: '<span>لنبدأ</span><span>رحلتك</span>' },
    /* logo hover label (every page) -> "Zero to One" in Arabic */
    { sel: '.brand-mark .brand-label', html: 'من الصفر إلى الواحد' },
    /* hero rolling marquee "ZERO 2 ONE —" (GSAP clones it, so translate every copy) */
    { sel: '.big-name .name-wrap h1', html: 'من الصفر <span style="color:#F9460E;font-weight:900">إلى</span> الواحد<span class="spacer">—</span>' },
    /* loading-screen brand (home = plain text, service pages = stacked site + name) */
    { sel: '.loading-brand:not(.loading-brand-stack)', html: 'من الصفر إلى الواحد' },
    { sel: '.loading-brand-site', html: 'من الصفر إلى الواحد' }
  ];

  // normalize curly quotes -> straight, and collapse whitespace, so matching
  // is resilient to apostrophe/quote style differences between files
  function norm(s) {
    return s
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Western digits -> Eastern-Arabic numerals (٠-٩). Each whole number (a phone,
  // year, etc. — including a leading + and internal spaces/separators) is wrapped
  // in a left-to-right isolate (U+2066…U+2069) so it always reads left-to-right
  // inside the RTL page. A digit run touching a letter is part of a word/identifier
  // (e.g. the "2" in info@zero2one.sa) and is left completely untouched.
  function toArabicDigits(s) {
    var isLetter = /[A-Za-z؀-ۿ]/;
    return s.replace(/\+?\d[\d\s./+()-]*\d|\+?\d/g, function (tok, offset, str) {
      if (isLetter.test(str.charAt(offset - 1)) || isLetter.test(str.charAt(offset + tok.length))) return tok;
      var ar = tok.replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.charAt(+d); });
      return '⁦' + ar + '⁩';
    });
  }

  // pre-build a dictionary keyed by the normalized English
  var NT = {};
  Object.keys(T).forEach(function (k) { NT[norm(k)] = T[k]; });

  function apply() {
    var html = document.documentElement;
    html.setAttribute('lang', 'ar');
    html.setAttribute('dir', 'rtl');
    document.body.classList.add('lang-ar');

    var root = document.querySelector('main');
    if (root) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
          if (p.closest && p.closest('.loading-container')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var key = norm(n.nodeValue);
        var v = Object.prototype.hasOwnProperty.call(NT, key) ? NT[key] : n.nodeValue;
        // unify the brand name everywhere in Arabic (never inside the email address)
        v = v.replace(/(?<!@)zero\s?(?:2|to)\s?one/gi, '«من الصفر إلى الواحد»');
        // Eastern-Arabic numerals — but skip figures rewritten live by JS
        // (the footer clock and the animated hero stat counters)
        var p = n.parentNode;
        var isLive = p && p.closest && p.closest('#timeSpan, .stat-number');
        if (!isLive) v = toArabicDigits(v);
        if (v !== n.nodeValue) n.nodeValue = v;
      });
    }

    SPECIAL.forEach(function (s) {
      // querySelectorAll so GSAP-cloned copies (e.g. the hero marquee) get translated too
      document.querySelectorAll(s.sel).forEach(function (el) { el.innerHTML = s.html; });
    });

    // service-page loading screen shows the service name under the brand — translate it
    document.querySelectorAll('.loading-brand-name').forEach(function (el) {
      var k = norm(el.textContent);
      if (Object.prototype.hasOwnProperty.call(NT, k)) el.textContent = NT[k];
    });
  }

  if (document.readyState !== 'loading') apply();
  else document.addEventListener('DOMContentLoaded', apply);

  // The hero marquee is cloned by GSAP a moment after load; re-apply so the
  // duplicated copy is translated even if it was created after the first pass.
  setTimeout(apply, 800);
  setTimeout(apply, 1800);

  // The site uses barba.js (AJAX page transitions) which swaps <main>.
  // Re-translate the freshly injected container after every transition.
  function hookBarba() {
    if (window.barba && barba.hooks) {
      barba.hooks.afterEnter(function () { apply(); });
      return true;
    }
    return false;
  }
  if (!hookBarba()) {
    // barba may not be initialised yet — retry briefly
    var tries = 0;
    var t = setInterval(function () {
      if (hookBarba() || ++tries > 40) clearInterval(t);
    }, 100);
  }
})();
