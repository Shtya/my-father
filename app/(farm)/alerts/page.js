import Link from "next/link";
import { listNotifications, markNotificationsRead } from "@/lib/farm";
import { Page } from "@/components/ui";

export default async function AlertsPage() {
  const rows = await listNotifications();
  await markNotificationsRead();
  return (
    <Page title="التنبيهات">
      {rows.length ? rows.map((row) => (
        <Link key={row.id} href={row.href || "/home"} className="block border-b border-line bg-paper px-4 py-3 last:border-b-0 hover:bg-soft">
          <p className="font-semibold">{row.title}</p>
          <p className="text-muted">{row.body}</p>
        </Link>
      )) : <p className="bg-paper px-3 py-3 text-sm">ما فيش تنبيهات دلوقتي.</p>}
    </Page>
  );
}
