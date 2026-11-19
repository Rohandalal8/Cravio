import { SectionPage } from "@/components/section-page";

export default function OnboardingDocumentsPage() {
  return (
    <SectionPage
      eyebrow="Step 2 of 3"
      title="Documents"
      description="Upload the documents required to verify your restaurant application."
      actions={[{ href: "/onboarding/success", label: "Finish setup" }]}
    />
  );
}
