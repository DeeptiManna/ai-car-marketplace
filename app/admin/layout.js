import { notFound } from "next/navigation";
import { Sidebar } from "./_components/sidebar";
import { getAdmin } from "@/actions/admin";
import Header from "@/components/header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }) {
  const admin = await getAdmin();

  // If user not found in DB or not admin → 404
  if (!admin?.authorized) {
    notFound();
  }

  return (
    <div className="h-full">
      <Header isAdminPage={true} />

      <div className="flex h-full w-56 flex-col fixed inset-y-0 top-20 z-50">
        <Sidebar />
      </div>

      <main className="md:pl-56 pt-[80px] h-full">
        {children}
      </main>
    </div>
  );
}
