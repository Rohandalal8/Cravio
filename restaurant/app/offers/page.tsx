import { RouteShell } from "@/components/route-shell";
import { SectionPage } from "@/components/section-page";

export default function OffersPage() {
  return (
    <RouteShell>
      <SectionPage
        eyebrow="Growth tools"
        title="Offers"
        description="Create, validate, and manage the coupons that bring guests back."
      />
    </RouteShell>
  );
}
