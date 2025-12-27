import { notFound } from "next/navigation";
import { Sidebar } from "./_components/sidebar";
import { getAdmin } from "@/actions/admin";
import Header from "@/components/header";

/**
 * ✅ FORCE THIS ROUTE TO BE DYNAMIC
 * This prevents Next.js from trying to statically generate it
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const admin = await getAdmin();

  // If user not admin → 404
  if (!admin.authorized) {
    notFound();
  }

  return (
    <div className="h-full">
      <Header isAdminPage={true} />

      <div className="flex h-full w-56 flex-col top-20 fixed inset-y-0 z-50">
        <Sidebar />
      </div>

      <main className="md:pl-56 pt-[80px] h-full">
        {children}
      </main>
    </div>
  );
}
