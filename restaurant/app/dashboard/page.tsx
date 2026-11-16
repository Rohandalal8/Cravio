import { RouteShell } from "@/components/route-shell";
import { SectionPage } from "@/components/section-page";

export default function DashboardPage() {
  return (
    <RouteShell>
      <SectionPage
        eyebrow="Operations desk"
        title="Dashboard"
        description="Your daily restaurant overview, order queue, and service health live here."
        actions={[
          { href: "/orders", label: "View orders" },
          { href: "/analytics", label: "Open analytics" },
        ]}
      />
    </RouteShell>
  );
}
