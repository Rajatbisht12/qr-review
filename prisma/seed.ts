import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --- Plans ---
  const starter = await prisma.plan.upsert({
    where: { name: "Starter" },
    update: {},
    create: { name: "Starter", monthlyQuota: 500, priceCents: 0 },
  });
  const growth = await prisma.plan.upsert({
    where: { name: "Growth" },
    update: {},
    create: { name: "Growth", monthlyQuota: 5000, priceCents: 99900 },
  });

  // --- Admin user ---
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { email: "admin@demo.com", passwordHash: adminHash, role: "admin" },
  });

  // --- Demo tenants ---
  type SeedTenant = {
    subdomain: string;
    businessName: string;
    category: string;
    googleReviewUrl: string;
    colorPrimary: string;
    colorSecondary: string;
    welcome: string;
    managerEmail: string;
    whatsapp: string;
    planId: string;
    sampleReviewsEnabled?: boolean;
    sampleReviews?: string[];
  };
  const tenants: SeedTenant[] = [
    {
      subdomain: "pizzapalace",
      businessName: "Pizza Palace",
      category: "restaurant",
      googleReviewUrl: "https://search.google.com/local/writereview?placeid=DEMO_PIZZA",
      colorPrimary: "#e11d48",
      colorSecondary: "#f59e0b",
      welcome: "How was your meal at Pizza Palace?",
      managerEmail: "manager@pizzapalace.com",
      whatsapp: "+919999900001",
      planId: growth.id,
      // Demo of the opt-in sample-reviews feature (off for the other tenant).
      sampleReviewsEnabled: true,
      sampleReviews: [
        "Great pizza and a really friendly team. The crust was perfect and service was quick.",
        "Lovely spot for a casual dinner. Fresh ingredients and a warm atmosphere — will come back!",
        "Had a wonderful time here. Tasty food, fair prices and the staff made us feel welcome.",
      ],
    },
    {
      subdomain: "glowsalon",
      businessName: "Glow Salon & Spa",
      category: "salon",
      googleReviewUrl: "https://search.google.com/local/writereview?placeid=DEMO_GLOW",
      colorPrimary: "#7c3aed",
      colorSecondary: "#ec4899",
      welcome: "How was your visit to Glow Salon?",
      managerEmail: "manager@glowsalon.com",
      whatsapp: "+919999900002",
      planId: starter.id,
    },
  ];

  for (const t of tenants) {
    const tenant = await prisma.tenant.upsert({
      where: { subdomain: t.subdomain },
      update: {},
      create: {
        subdomain: t.subdomain,
        businessName: t.businessName,
        category: t.category,
        googleReviewUrl: t.googleReviewUrl,
        planId: t.planId,
        sampleReviewsEnabled: t.sampleReviewsEnabled ?? false,
        sampleReviewThreshold: 3,
        reviewTemplates: t.sampleReviews
          ? { create: t.sampleReviews.map((text, i) => ({ text, sortOrder: i })) }
          : undefined,
        theme: {
          create: {
            colorPrimary: t.colorPrimary,
            colorSecondary: t.colorSecondary,
            welcomeMessage: t.welcome,
          },
        },
        contacts: {
          create: { name: "Manager", whatsappNumber: t.whatsapp, alertThreshold: 2 },
        },
      },
    });

    const mgrHash = await bcrypt.hash("manager123", 10);
    await prisma.user.upsert({
      where: { email: t.managerEmail },
      update: {},
      create: {
        email: t.managerEmail,
        passwordHash: mgrHash,
        role: "manager",
        tenantId: tenant.id,
      },
    });

    // A little sample feedback so dashboards aren't empty.
    const existing = await prisma.feedback.count({ where: { tenantId: tenant.id } });
    if (existing === 0) {
      await prisma.feedback.createMany({
        data: [
          { tenantId: tenant.id, rating: 5, feedbackText: "Loved it, will be back!" },
          { tenantId: tenant.id, rating: 4 },
          { tenantId: tenant.id, rating: 2, feedbackText: "Waited too long to be served." },
        ],
      });
      await prisma.event.createMany({
        data: [
          { tenantId: tenant.id, type: "scan" },
          { tenantId: tenant.id, type: "scan" },
          { tenantId: tenant.id, type: "scan" },
          { tenantId: tenant.id, type: "rating", rating: 5 },
          { tenantId: tenant.id, type: "rating", rating: 4 },
          { tenantId: tenant.id, type: "rating", rating: 2 },
          { tenantId: tenant.id, type: "google_cta_click", rating: 5 },
          { tenantId: tenant.id, type: "google_cta_click", rating: 2 },
          { tenantId: tenant.id, type: "private_submit", rating: 2 },
        ],
      });
    }
  }

  console.log("✅ Seed complete.");
  console.log("   Admin login:   admin@demo.com / admin123");
  console.log("   Manager login: manager@pizzapalace.com / manager123");
  console.log("   Tenants: pizzapalace, glowsalon");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
