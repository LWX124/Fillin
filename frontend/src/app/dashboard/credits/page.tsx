"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: string;
  display_order: number;
}

export default function CreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    api.get("/credits/packages").then((res) => setPackages(res.data));
    api.get("/credits/balance").then((res) => setBalance(res.data.credits));
  }, [router]);

  const handlePurchase = async (packageId: string) => {
    setLoading(true);
    try {
      const res = await api.post("/credits/purchase", {
        package_id: packageId,
        payment_method: "mock",
      });
      setBalance(res.data.new_balance);
      alert(`充值成功！获得 ${res.data.credits_added} 积分`);
    } catch {
      alert("充值失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/dashboard" className="text-xl font-bold text-gray-900">Fillin</a>
          <span className="text-sm text-gray-600">当前积分: <strong>{balance}</strong></span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">积分充值</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-lg border bg-white p-6 shadow-sm text-center">
              <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">{pkg.credits}</p>
              <p className="text-sm text-gray-500">积分</p>
              <p className="mt-2 text-lg text-gray-700">${pkg.price}</p>
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading}
                className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                购买
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
