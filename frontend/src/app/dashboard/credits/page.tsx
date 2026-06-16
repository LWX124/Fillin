"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Zap } from "lucide-react";
import api from "@/lib/api";
import { AppShell } from "@/components/AppShell";

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
    if (!token) {
      router.push("/login");
      return;
    }
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Credit Reactor"
      subtitle="Manage the compute budget used for crawling, retrieval, and AI content generation."
    >
      <section className="surface-panel animate-enter rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Current balance</p>
            <p className="mt-2 text-5xl font-black tracking-tight">{balance}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklch,var(--accent)_11%,transparent)] p-4">
            <div className="flex items-center gap-2 font-bold">
              <Zap size={18} className="text-[var(--accent)]" />
              Compute ready
            </div>
            <p className="muted mt-1 text-sm">Mock purchase flow enabled for development.</p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {packages.map((pkg, index) => (
          <article key={pkg.id} className="surface-card scan-line animate-enter rounded-2xl p-5 text-center" style={{ "--i": index } as React.CSSProperties}>
            <Coins className="mx-auto text-[var(--primary)]" size={28} />
            <h3 className="mt-4 text-xl font-black">{pkg.name}</h3>
            <p className="mt-3 text-4xl font-black text-[var(--primary)]">{pkg.credits}</p>
            <p className="muted text-sm">credits</p>
            <p className="mt-4 text-lg font-bold">${pkg.price}</p>
            <button onClick={() => handlePurchase(pkg.id)} disabled={loading} className="btn-primary mt-5 w-full">
              Purchase
            </button>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
