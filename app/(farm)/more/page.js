import Link from "next/link";
import { BookOpen, ChevronLeft, HeartPulse, Receipt, Search, Settings, ShoppingCart, Tractor, Users, Warehouse, Bell, BarChart3 } from "lucide-react";
import { Page } from "@/components/ui";

const items = [
  { href: "/expenses", label: "المصاريف", hint: "علف، دوا، كتاكيت وأي فلوس اتصرفت", icon: Receipt },
  { href: "/sales", label: "المبيعات", hint: "الفراخ اللي اتباعت", icon: ShoppingCart },
  { href: "/customers", label: "العملاء", hint: "مين عليه فلوس", icon: Users },
  { href: "/suppliers", label: "الموردين", hint: "الفلوس اللي علينا", icon: Tractor },
  { href: "/inventory", label: "المخزون", hint: "العلف والأصناف الموجودة", icon: Warehouse },
  { href: "/health", label: "الصحة", hint: "الأدوية والتطعيمات والأعراض", icon: HeartPulse },
  { href: "/reports", label: "التقارير", hint: "ملخص الدورات والمصاريف والربح", icon: BarChart3 },
  { href: "/articles", label: "المقالات", hint: "معلومات عن تربية الدواجن", icon: BookOpen },
  { href: "/alerts", label: "التنبيهات", hint: "حاجات محتاجة متابعة", icon: Bell },
  { href: "/search", label: "بحث", hint: "دوّر على عميل أو مورد أو صنف", icon: Search },
  { href: "/settings", label: "الإعدادات", hint: "التنبيهات والنسخة الاحتياطية", icon: Settings },
];

export default function MorePage() {
  return (
    <Page title="المزيد">
      <div className="border-y border-line bg-paper">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 hover:bg-soft active:bg-soft">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-green"><Icon size={22} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{item.label}</span>
                <span className="block text-sm text-muted">{item.hint}</span>
              </span>
              <ChevronLeft size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
