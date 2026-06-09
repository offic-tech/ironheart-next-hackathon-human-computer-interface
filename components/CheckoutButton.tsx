"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  priceId: string;
  planName: string;
  className?: string;
  children: React.ReactNode;
};

export default function CheckoutButton({ priceId, planName, className, children }: CheckoutButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function startCheckout() {
    setStatus("loading");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          metadata: {
            plan: planName,
            source: "oya-landing-page",
          },
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Checkout session failed.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Stripe checkout failed:", error);
      setStatus("error");
    }
  }

  return (
    <button className={className} disabled={status === "loading"} onClick={startCheckout} type="button">
      {status === "loading" ? "Opening checkout" : status === "error" ? "Try again" : children}
    </button>
  );
}
