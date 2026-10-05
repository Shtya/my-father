import Link from "next/link";
import { BookOpen, HeartPulse, Receipt, Search, Settings, ShoppingCart, Tractor, Users, Warehouse, Bell, BarChart3 } from "lucide-react";
import { Page } from "@/components/ui";

const items = [
  { href: "/expenses", label: "المصاريف", icon: Receipt },
  { href: "/sales", label: "المبيعات", icon: ShoppingCart },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/suppliers", label: "الموردين", icon: Tractor },
  { href: "/inventory", label: "المخزون", icon: Warehouse },
  { href: "/health", label: "الصحة", icon: HeartPulse },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/articles", label: "المقالات", icon: BookOpen },
  { href: "/alerts", label: "التنبيهات", icon: Bell },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/search", label: "بحث", icon: Search },
];

export default function MorePage() {
  return (
    <Page title="المزيد">
      <div className="border-y border-line bg-paper">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex h-11 items-center gap-3 border-b border-line px-3 text-sm last:border-b-0 hover:bg-soft">
              <Icon size={18} />
              <span className="font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
