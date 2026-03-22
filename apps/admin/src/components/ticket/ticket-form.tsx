"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ticketFormSchema, TicketFormValues } from "/shared/validation/ticket";
import { AttachmentUpload } from "./attachment-upload";
import { KnowledgeSuggestions } from "./knowledge-suggestions";
import { useBranding } from "/shared/branding/context";
import { Label } from "/ui/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatPhoneNumberInput } from "@crinity/shared/utils/phone-format";

interface TicketFormProps {
  requestTypes: { id: string; name: string; description?: string | null }[];
}

export function TicketForm({ requestTypes }: TicketFormProps) {
  const router = useRouter();
  const branding = useBranding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      priority: "MEDIUM",
    },
  });

  const subject = watch("subject");
  const description = watch("description");

  const onSubmit = async (data: TicketFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value);
        }
      });

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "티켓 생성에 실패했습니다.");
      }

      router.push(`/ticket/submitted?id=${result.ticketNumber}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="customerName" className="text-slate-700">
            이름 <span className="text-red-500">*</span>
          </Label>
          <input
            id="customerName"
            type="text"
            {...register("customerName")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none transition-all"
            placeholder="홍길동"
          />
          {errors.customerName && (
            <p className="text-sm text-red-500">{errors.customerName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail" className="text-slate-700">
            이메일 <span className="text-red-500">*</span>
          </Label>
          <input
            id="customerEmail"
            type="email"
            {...register("customerEmail")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all"
            placeholder="hong@example.com"
          />
          {errors.customerEmail && (
            <p className="text-sm text-red-500">{errors.customerEmail.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="customerPhone" className="text-slate-700">
            전화번호
          </Label>
          <input
            id="customerPhone"
            type="tel"
            {...register("customerPhone")}
            onChange={(e) => {
              const formatted = formatPhoneNumberInput(e.target.value);
              e.target.value = formatted;
              register("customerPhone").onChange(e);
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all"
            placeholder="010-1234-5678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerOrganization" className="text-slate-700">
            소속/회사
          </Label>
          <input
            id="customerOrganization"
            type="text"
            {...register("customerOrganization")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all"
            placeholder="회사명 또는 소속 기관"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="requestTypeId" className="text-slate-700">
            문의 유형 <span className="text-red-500">*</span>
          </Label>
          <select
            id="requestTypeId"
            {...register("requestTypeId")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="">선택해주세요</option>
            {requestTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          {errors.requestTypeId && (
            <p className="text-sm text-red-500">{errors.requestTypeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="text-slate-700">
            우선순위 <span className="text-red-500">*</span>
          </Label>
          <select
            id="priority"
            {...register("priority")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="LOW">낮음</option>
            <option value="MEDIUM">보통</option>
            <option value="HIGH">높음</option>
            <option value="URGENT">긴급</option>
          </select>
          {errors.priority && (
            <p className="text-sm text-red-500">{errors.priority.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject" className="text-slate-700">
          제목 <span className="text-red-500">*</span>
        </Label>
        <input
          id="subject"
          type="text"
          {...register("subject")}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all"
          placeholder="문의 제목을 입력해주세요"
        />
        {errors.subject && (
          <p className="text-sm text-red-500">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-slate-700">
          내용 <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="description"
          {...register("description")}
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all resize-y"
          placeholder="문의 내용을 상세히 입력해주세요 (최소 20자)"
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <KnowledgeSuggestions subject={subject || ""} description={description || ""} />

      <div className="space-y-2">
        <Label className="text-slate-700">첨부파일</Label>
        <AttachmentUpload files={files} onChange={setFiles} />
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 px-6 text-base font-medium text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        style={{ backgroundColor: branding.primaryColor }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            제출 중...
          </>
        ) : (
          "티켓 제출"
        )}
      </button>
    </form>
  );
}
