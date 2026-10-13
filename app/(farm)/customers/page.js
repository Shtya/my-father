import Link from "next/link";
import { LiveTotal } from "@/components/live-total";
import { PeopleBoard } from "@/components/people-board";
import { MORE, Page } from "@/components/ui";
import { listCustomers, serverNow } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function CustomersPage() {
  const renderedAt = serverNow();
  const rows = await listCustomers();
  const total = rows.reduce((sum, row) => sum + Number(row.remaining), 0);
  return (
    <Page back={MORE} title="العملاء" action={<LiveTotal label="فلوس عند الناس" base={total} scope="customers" ids={rows.map((row) => row.id)} renderedAt={renderedAt} />}>
      <PeopleBoard
        kind="customer"
        renderedAt={renderedAt}
        rows={rows.map((row) => ({
          id: row.id,
          href: `/customers/${row.id}`,
          name: row.name,
          phone: row.phone || "",
          notes: row.notes || "",
          remaining: Number(row.remaining),
          remainingLabel: formatMoney(row.remaining),
          totalLabel: formatMoney(row.total_amount),
        }))}
      />
      <Link href="/payments/new?direction=in" className="mt-4 flex h-12 items-center justify-center bg-green font-semibold">تسجيل دفعة</Link>
    </Page>
  );
}
