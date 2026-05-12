"use client";

import Link from "next/link";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">📄 Checkout</h1>
        <p className="text-gray-600 mb-4">Checkout pagina (placeholder)</p>
        <Link href="/" prefetch={false} className="text-blue-600 hover:underline">
          ← Terug naar Inboeken
        </Link>
      </div>
    </div>
  );
}

