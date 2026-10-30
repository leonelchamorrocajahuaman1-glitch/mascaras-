import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="min-h-screen px-[var(--gutter)] pb-32 pt-32">
      <h1 className="font-display text-[clamp(72px,11vw,200px)] font-black uppercase leading-[0.8]">
        Check<span className="text-outline">out</span>
      </h1>
      <CheckoutForm />
    </div>
  );
}
