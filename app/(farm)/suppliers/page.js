import Link from "next/link";
import { PeopleBoard } from "@/components/people-board";
import { MORE, Page, Total } from "@/components/ui";
import { listSuppliers } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function SuppliersPage() {
  const rows = await listSuppliers();
  const total = rows.reduce((sum, row) => sum + Number(row.remaining), 0);
  return (
    <Page back={MORE} title="الموردين" action={<Total label="فلوس علينا" value={formatMoney(total)} />}>
      <PeopleBoard
        kind="supplier"
        rows={rows.map((row) => ({
          id: row.id,
          href: `/suppliers/${row.id}`,
          name: row.name,
          phone: row.phone || "",
          products: row.products || "",
          notes: row.notes || "",
          remainingLabel: formatMoney(row.remaining),
          totalLabel: formatMoney(row.total_amount),
        }))}
      />
      <Link href="/payments/new?direction=out" className="mt-4 flex h-12 items-center justify-center bg-green font-semibold">تسجيل سداد</Link>
    </Page>
  );
}
