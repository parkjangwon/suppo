"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBranding } from "@/lib/branding/context";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function TicketLookupForm() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const branding = useBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketNumber, email }),
      });

      if (response.ok) {
        router.push(`/ticket/${ticketNumber}`);
      } else {
        setError("일치하는 티켓을 찾을 수 없습니다");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="ticketNumber" className="text-slate-700">티켓 번호</Label>
        <input
          id="ticketNumber"
          type="text"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          placeholder="CRN-YYYYMMDD-XXXX"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all uppercase"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700">이메일</Label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all"
          required
        />
      </div>

      <button 
        type="submit" 
        className="w-full py-4 px-6 text-base font-medium text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-2"
        style={{ backgroundColor: branding.primaryColor }}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            조회 중...
          </>
        ) : (
          "조회"
        )}
      </button>
    </form>
  );
}
