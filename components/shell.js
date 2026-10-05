"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/form";
import { QuickCalc } from "@/components/quick-calc";
import {
  Bell,
  Bird,
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Tractor,
  TrendingUp,
  Users,
  Warehouse,
  Wheat,
} from "lucide-react";

const tabs = [
  { href: "/home", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/cycle", label: "الدورة", icon: Bird },
  { href: "/market", label: "السوق", icon: TrendingUp },
  { href: "/more", label: "المزيد", icon: Menu },
];

const actions = [
  { href: "/expenses/new", label: "إضافة مصروف", icon: Receipt },
  { href: "/sales/new", label: "تسجيل بيع", icon: ShoppingCart },
  { href: "/log", label: "تسجيل نفوق", icon: Bird },
  { href: "/purchases/new", label: "إضافة شراء", icon: Wheat },
  { href: "/payments/new", label: "تسجيل دفعة", icon: Users },
  { href: "/log?focus=weight", label: "تسجيل وزن", icon: Tractor },
  { href: "/health/new", label: "تسجيل دواء", icon: HeartPulse },
];

const side = [
  { href: "/home", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/cycle", label: "الدورة الحالية", icon: Bird },
  { href: "/expenses", label: "المصاريف", icon: Receipt },
  { href: "/sales", label: "المبيعات", icon: ShoppingCart },
  { href: "/customers", label: "العملاء والديون", icon: Users },
  { href: "/suppliers", label: "الموردين", icon: Tractor },
  { href: "/inventory", label: "الأعلاف والمخزون", icon: Warehouse },
  { href: "/market", label: "السوق", icon: TrendingUp },
  { href: "/health", label: "الصحة", icon: HeartPulse },
  { href: "/log", label: "المتابعة اليومية", icon: Bird },
  { href: "/reports", label: "التقارير", icon: Receipt },
  { href: "/articles", label: "المقالات", icon: BookOpen },
  { href: "/alerts", label: "التنبيهات", icon: Bell },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/search", label: "بحث", icon: Search },
];

export function Shell({ farmName, unread, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-full md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-l border-line bg-green text-white md:flex md:min-h-screen md:flex-col">
        <div className="px-5 py-6">
          <p className="text-sm text-white/70">البيت</p>
          <p className="text-base font-semibold">{farmName}</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {side.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`flex h-11 items-center gap-3 px-3 ${active ? "bg-white/15" : "hover:bg-white/10"}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="safe-bottom">
        {children}
      </div>
      <nav className="bottom-nav fixed inset-x-3 z-30 flex items-end justify-between rounded-2xl border border-line bg-paper px-1.5 py-1.5 shadow-[0_10px_30px_rgb(28_36_28/0.14)] md:hidden">
        {tabs.slice(0, 2).map((item) => <Tab key={item.href} item={item} pathname={pathname} />)}
        <button type="button" className="flex w-14 shrink-0 flex-col items-center" onClick={() => setOpen(true)}>
          <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-green shadow-[0_6px_16px_rgb(36_57_44/0.28)]">
            <Plus size={20} />
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-green">تسجيل</span>
        </button>
        {tabs.slice(2).map((item) => <Tab key={item.href} item={item} pathname={pathname} badge={item.href === "/more" ? unread : 0} />)}
      </nav>
      <QuickCalc />
      {open ? (
        <Sheet title="تسجيل سريع" onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex h-11 items-center gap-2 border border-line px-3 text-sm font-semibold">
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function tabActive(href, pathname) {
  if (href === "/home") return pathname === "/home";
  if (href === "/cycle") return pathname === "/cycle" || pathname.startsWith("/cycle/") || pathname.startsWith("/log") || pathname.startsWith("/simulator");
  if (href === "/market") return pathname === "/market" || pathname.startsWith("/market/");
  if (href !== "/more") return false;
  const more = ["/more", "/expenses", "/sales", "/customers", "/suppliers", "/inventory", "/health", "/reports", "/articles", "/alerts", "/settings", "/search"];
  return more.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function Tab({ item, pathname, badge = 0 }) {
  const Icon = item.icon;
  const active = tabActive(item.href, pathname);
  return (
    <Link href={item.href} className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 ${active ? "bg-green text-white" : "text-muted"}`}>
      <Icon size={18} />
      <span className="text-[11px] font-semibold">{item.label}</span>
      {badge > 0 ? <span className="absolute top-1 left-1/2 h-1.5 w-1.5 translate-x-2 rounded-full bg-clay" /> : null}
    </Link>
  );
}

