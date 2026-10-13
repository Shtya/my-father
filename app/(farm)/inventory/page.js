import { InventoryBoard } from "@/components/inventory-board";
import { MORE, Page } from "@/components/ui";
import { listInventory, serverNow } from "@/lib/farm";

export default async function InventoryPage() {
  const renderedAt = serverNow();
  const items = await listInventory();
  return (
    <Page back={MORE} title="المخزون">
      <InventoryBoard renderedAt={renderedAt} items={items.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        avg_unit_cost: item.avg_unit_cost,
        low: Number(item.min_quantity) > 0 && Number(item.quantity) <= Number(item.min_quantity),
      }))} />
    </Page>
  );
}
