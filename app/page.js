import { redirect } from "next/navigation";
import { getFarm } from "@/lib/farm";

export default async function IndexPage() {
  try {
    await getFarm();
  } catch {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <p className="text-sm text-muted">قاعدة البيانات</p>
        <h1 className="mt-2 text-3xl font-semibold">مش قادر أوصل للبيانات</h1>
        <p className="mt-3 text-muted">تأكد إن الاتصال شغال، ثم أعد فتح الصفحة.</p>
      </main>
    );
  }
  redirect("/home");
}
