"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TicketLookupForm() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="ticketNumber">티켓 번호</Label>
        <Input
          id="ticketNumber"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          placeholder="CRN-..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "조회 중..." : "조회"}
      </Button>
    </form>
  );
}
