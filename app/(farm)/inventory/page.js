import { InventoryBoard } from "@/components/inventory-board";
import { Page } from "@/components/ui";
import { listInventory } from "@/lib/farm";

export default async function InventoryPage() {
  const items = await listInventory();
  return (
    <Page title="المخزون">
      <InventoryBoard items={items.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        avg_unit_cost: item.avg_unit_cost,
      }))} />
    </Page>
  );
}
