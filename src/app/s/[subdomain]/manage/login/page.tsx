import LoginForm from "@/components/LoginForm";
import { getTenantBySubdomain } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function ManagerLoginPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) notFound();

  return (
    <LoginForm
      title={`${tenant.businessName} — Manager`}
      subtitle="Sign in to view feedback and alerts."
      next={`/s/${subdomain}/manage`}
      hint="Demo: manager@pizzapalace.com / manager123"
    />
  );
}
