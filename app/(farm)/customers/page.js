import Link from "next/link";
import { PeopleBoard } from "@/components/people-board";
import { Page } from "@/components/ui";
import { listCustomers } from "@/lib/farm";
import { formatMoney } from "@/lib/format";

export default async function CustomersPage() {
  const rows = await listCustomers();
  const total = rows.reduce((sum, row) => sum + Number(row.remaining), 0);
  return (
    <Page title="العملاء" action={<span className="num font-semibold">{formatMoney(total)}</span>}>
      <PeopleBoard
        kind="customer"
        rows={rows.map((row) => ({
          id: row.id,
          href: `/customers/${row.id}`,
          name: row.name,
          phone: row.phone || "",
          notes: row.notes || "",
          remainingLabel: formatMoney(row.remaining),
          totalLabel: formatMoney(row.total_amount),
        }))}
      />
      <Link href="/payments/new?direction=in" className="mt-4 flex h-12 items-center justify-center bg-green font-semibold">تسجيل دفعة</Link>
    </Page>
  );
}
