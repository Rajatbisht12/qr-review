import LoginForm from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <LoginForm
      title="ReviewLoop Admin"
      subtitle="Sign in to manage tenants, branding and billing."
      next="/admin"
      expectAdmin
      hint="Demo: admin@demo.com / admin123"
    />
  );
}
