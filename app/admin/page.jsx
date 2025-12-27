import { getDashboardData } from "@/actions/admin";
import { Dashboard } from "./_components/dashboard";

/**
 * ✅ FORCE DYNAMIC RENDERING
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Vehiql Admin",
  description: "Admin dashboard for Vehiql car marketplace",
};

export default async function AdminDashboardPage() {
  const dashboardData = await getDashboardData();

  if (!dashboardData.success) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-red-500">
          Failed to load dashboard
        </h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Dashboard initialData={dashboardData.data} />
    </div>
  );
}
