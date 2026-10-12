import { getFarm, unreadCount } from "@/lib/farm";
import { Shell } from "@/components/shell";

export default async function FarmLayout({ children, sheet }) {
  const [farm, unread] = await Promise.all([getFarm(), unreadCount()]);
  return (
    <Shell farmName={farm?.name || "بيت عبد الرحمن"} unread={unread}>
      {children}
      {sheet}
    </Shell>
  );
}
