import Link from "next/link";
import { LiveTotal } from "@/components/live-total";
import { PeopleBoard } from "@/components/people-board";
import { MORE, Page } from "@/components/ui";
import { listSuppliers, serverNow } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function SuppliersPage() {
  const renderedAt = serverNow();
  const rows = await listSuppliers();
  const total = rows.reduce((sum, row) => sum + Number(row.remaining), 0);
  return (
    <Page back={MORE} title="الموردين" action={<LiveTotal label="فلوس علينا" base={total} scope="suppliers" ids={rows.map((row) => row.id)} renderedAt={renderedAt} />}>
      <PeopleBoard
        kind="supplier"
        renderedAt={renderedAt}
        rows={rows.map((row) => ({
          id: row.id,
          href: `/suppliers/${row.id}`,
          name: row.name,
          phone: row.phone || "",
          products: row.products || "",
          notes: row.notes || "",
          remaining: Number(row.remaining),
          remainingLabel: formatMoney(row.remaining),
          total: Number(row.total_amount),
          totalLabel: formatMoney(row.total_amount),
        }))}
      />
      <Link href="/payments/new?direction=out" className="mt-4 flex h-12 items-center justify-center bg-green font-semibold">تسجيل سداد</Link>
    </Page>
  );
}
