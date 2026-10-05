import { Field, Form } from "@/components/form";
import { Page } from "@/components/ui";
import { getFarm } from "@/lib/farm";

export default async function SettingsPage() {
  const farm = await getFarm();
  return (
    <Page title="الإعدادات">
      <p className="text-sm text-muted">الاستعمال شخصي. للتثبيت على التليفون: من قائمة المتصفح اختار إضافة إلى الشاشة الرئيسية.</p>
      <Form endpoint="/api/settings" method="PATCH" redirectTo="/settings" submitLabel="حفظ الإعدادات">
        <p className="text-sm text-muted">العملة: جنيه مصري. الأرقام بتظهر بالشكل 35,250 جنيه.</p>
        <Field label="زيادة الوزن المتوقعة جرام في اليوم" name="assumedDailyGainGrams" type="number" step="1" defaultValue={farm.assumed_daily_gain_grams} />
        <label className="flex min-h-11 items-center gap-3"><input className="h-5 w-5" type="checkbox" name="notifyStock" defaultChecked={farm.notify_stock} /> تنبيه المخزون</label>
        <label className="flex min-h-11 items-center gap-3"><input className="h-5 w-5" type="checkbox" name="notifyDebt" defaultChecked={farm.notify_debt} /> تنبيه الفلوس</label>
        <label className="flex min-h-11 items-center gap-3"><input className="h-5 w-5" type="checkbox" name="notifyDaily" defaultChecked={farm.notify_daily} /> تنبيه المتابعة اليومية</label>
        <label className="flex min-h-11 items-center gap-3"><input className="h-5 w-5" type="checkbox" name="notifyPrices" defaultChecked={farm.notify_prices} /> تنبيه تغير السعر</label>
      </Form>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/backup" className="inline-flex h-12 items-center border border-line px-4">تنزيل نسخة من البيانات</a>
      </div>
      <p className="text-sm text-muted">النسخة دي ملف فيه الدورات والمصاريف والبيع.</p>
    </Page>
  );
}
