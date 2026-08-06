# Argan Design & Build — موقع شركة أرجان

موقع تعريفي (One-Page) لشركة أرجان للتصميم والبناء، ثنائي اللغة (عربي/إنجليزي) مع دعم كامل لاتجاه RTL/LTR.

A bilingual (Arabic/English) one-page marketing website for **Argan Design & Build**, a design-and-build / interior fit-out company, with full RTL/LTR support.

## المحتوى الحالي / Current status

المحتوى والصور حالياً **مبدئية (placeholder)** — نصوص تعريفية، أرقام، وصور SVG تجريبية — لحد ما يتوفر المحتوى الحقيقي للشركة (لوجو نهائي، صور مشاريع فعلية، بيانات تواصل حقيقية).

All copy, stats, and imagery are currently **placeholders** and should be swapped for real company content (final logo, real project photos, real contact details) once available.

## البنية / Structure

```
index.html              # الصفحة الرئيسية (كل الأقسام)
assets/css/style.css    # التنسيقات
assets/js/main.js       # التفاعلات (تبديل اللغة، القائمة، الفلاتر، السلايدر، النموذج)
assets/img/favicon.svg  # أيقونة الموقع
```

## الأقسام / Sections

- Header + Navigation + Language switch (AR/EN)
- Hero + stats counter
- About (mission / vision)
- Services (6 cards)
- Process (4 steps)
- Projects portfolio with category filter
- Why choose us
- Testimonials slider
- CTA banner
- Contact form + info + map placeholder
- Footer + WhatsApp floating button + back-to-top

## التشغيل / Run locally

الموقع ثابت (Static HTML/CSS/JS) بدون أي عملية بناء — يكفي فتح `index.html` مباشرة في المتصفح، أو تشغيل سيرفر بسيط:

No build step needed — open `index.html` directly, or serve locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## الخطوات القادمة المقترحة / Suggested next steps

- استبدال النصوص، اللوجو، وصور المشاريع بمحتوى حقيقي.
- ربط نموذج التواصل بخدمة إرسال فعلية (مثل Formspree أو باك اند مخصص).
- إضافة خريطة Google Maps حقيقية بدلاً من الـ placeholder.
- ربط روابط السوشيال ميديا الفعلية.
