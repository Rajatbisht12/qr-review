import { notFound } from "next/navigation";
import { getTenantBySubdomain } from "@/lib/tenant";
import { promptsForCategory } from "@/lib/prompts";
import CustomerFlow from "./CustomerFlow";

export const dynamic = "force-dynamic";

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  const theme = tenant.theme;
  const prompts = promptsForCategory(tenant.category);

  return (
    <main
      className="min-h-screen"
      style={
        {
          "--brand-primary": theme?.colorPrimary ?? "#4f46e5",
          "--brand-secondary": theme?.colorSecondary ?? "#0ea5e9",
          background: `linear-gradient(160deg, color-mix(in srgb, var(--brand-primary) 8%, #ffffff), #ffffff 60%)`,
        } as React.CSSProperties
      }
    >
      <CustomerFlow
        subdomain={tenant.subdomain}
        businessName={tenant.businessName}
        category={tenant.category}
        googleReviewUrl={tenant.googleReviewUrl}
        logoUrl={theme?.logoUrl ?? null}
        welcomeMessage={theme?.welcomeMessage ?? "How was your visit?"}
        thankYouMessage={theme?.thankYouMessage ?? "Thank you for your feedback!"}
        prompts={prompts}
        sampleReviewsEnabled={tenant.sampleReviewsEnabled}
        sampleReviewThreshold={tenant.sampleReviewThreshold}
        sampleReviews={tenant.reviewTemplates.map((t) => t.text)}
      />
    </main>
  );
}
