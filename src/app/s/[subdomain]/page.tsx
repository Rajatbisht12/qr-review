import { notFound } from "next/navigation";
import { getTenantBySubdomain } from "@/lib/tenant";
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

  const accent = theme?.colorPrimary ?? "#dd7a2e";

  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={
        {
          "--brand-primary": accent,
          "--brand-secondary": theme?.colorSecondary ?? "#e8a33d",
          // Warm "paper" backdrop that frames the card on larger screens (from the hi-fi design).
          background: "radial-gradient(125% 120% at 50% 0%, #efeae1 0%, #e2dbd0 100%)",
        } as React.CSSProperties
      }
    >
      <CustomerFlow
        subdomain={tenant.subdomain}
        businessName={tenant.businessName}
        category={tenant.category}
        accent={accent}
        googleReviewUrl={tenant.googleReviewUrl}
        logoUrl={theme?.logoUrl ?? null}
        welcomeMessage={theme?.welcomeMessage ?? "How was your experience?"}
        thankYouMessage={theme?.thankYouMessage ?? "Thank you for your feedback!"}
        sampleReviewsEnabled={tenant.sampleReviewsEnabled}
        sampleReviewThreshold={tenant.sampleReviewThreshold}
        sampleReviews={tenant.reviewTemplates.map((t) => t.text)}
      />
    </main>
  );
}
