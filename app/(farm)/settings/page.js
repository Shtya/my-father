import { Field, Form } from "@/components/form";
import { MORE, Page } from "@/components/ui";
import { getFarm } from "@/lib/farm";

const toggles = [
  ["notifyStock", "notify_stock", "نبهني لما العلف يقرب يخلص"],
  ["notifyDebt", "notify_debt", "نبهني بالفلوس اللي عند الناس"],
  ["notifyDaily", "notify_daily", "فكرني بالمتابعة اليومية"],
  ["notifyPrices", "notify_prices", "نبهني لما الأسعار تتغير كتير"],
];

export default async function SettingsPage() {
  const farm = await getFarm();
  return (
    <Page back={MORE} title="الإعدادات">
      <p className="text-base text-muted">لتثبيت التطبيق على التليفون: من قائمة المتصفح اختار «إضافة إلى الشاشة الرئيسية».</p>
      <Form endpoint="/api/settings" method="PATCH" submitLabel="حفظ الإعدادات" successMessage="الإعدادات اتحفظت." label="الإعدادات">
        <Field label="زيادة الوزن المتوقعة في اليوم (جرام)" name="assumedDailyGainGrams" type="number" step="1" defaultValue={farm.assumed_daily_gain_grams} hint="بتستخدم في تقدير «لو بعت ولا استنيت»." />
        <fieldset className="border-y border-line bg-paper">
          <legend className="mb-1 text-base font-bold">التنبيهات</legend>
          {toggles.map(([name, key, label]) => (
            <label key={name} className="flex min-h-12 items-center gap-3 border-b border-line px-3 text-base last:border-b-0">
              <input className="h-6 w-6 accent-[var(--green)]" type="checkbox" name={name} defaultChecked={farm[key]} />
              {label}
            </label>
          ))}
        </fieldset>
      </Form>
      <a href="/api/backup" download className="flex h-12 items-center justify-center border border-line bg-paper px-4 text-base font-semibold">تنزيل نسخة احتياطية من البيانات</a>
      <p className="text-sm text-muted">النسخة ملف فيه الدورات والمصاريف والبيع والعملاء. احتفظ بيه في مكان آمن.</p>
    </Page>
  );
}
