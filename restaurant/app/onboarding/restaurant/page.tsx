import { SectionPage } from "@/components/section-page";

export default function OnboardingRestaurantPage() {
  return (
    <SectionPage
      eyebrow="Step 1 of 3"
      title="Restaurant details"
      description="Tell us about your restaurant, cuisine, location, and contact details."
      actions={[{ href: "/onboarding/documents", label: "Continue" }]}
    />
  );
}
