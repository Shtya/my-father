import Link from "next/link";
import { listNotifications, markNotificationsRead } from "@/lib/farm";
import { MORE, Page } from "@/components/ui";

export default async function AlertsPage() {
  const rows = await listNotifications();
  await markNotificationsRead();
  return (
    <Page back={MORE} title="التنبيهات">
      {rows.length ? (
        <div className="border-y border-line bg-paper">
          {rows.map((row) => (
            <Link key={row.id} href={row.href || "/home"} className="block min-h-12 border-b border-line px-4 py-3 last:border-b-0 hover:bg-soft active:bg-soft">
              <p className="text-base font-semibold">{row.title}</p>
              <p className="text-base text-muted">{row.body}</p>
            </Link>
          ))}
        </div>
      ) : <p className="bg-paper px-3 py-4 text-base">ما فيش تنبيهات دلوقتي. لو حصل حاجة محتاجة متابعة هتظهر هنا.</p>}
    </Page>
  );
}
