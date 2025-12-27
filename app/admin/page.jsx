"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/actions/admin";
import { Dashboard } from "./_components/dashboard";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDashboardData()
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <p className="p-6 text-red-500">Failed to load dashboard</p>;
  }

  if (!data) {
    return <p className="p-6">Loading dashboard...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Dashboard initialData={data} />
    </div>
  );
}
