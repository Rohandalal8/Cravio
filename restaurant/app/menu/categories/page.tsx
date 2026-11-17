import { RouteShell } from "@/components/route-shell";
import { SectionPage } from "@/components/section-page";

export default function CategoriesPage() {
  return (
    <RouteShell>
      <SectionPage
        eyebrow="Menu studio"
        title="Categories"
        description="Create and reorder the sections guests use to browse your menu."
      />
    </RouteShell>
  );
}
