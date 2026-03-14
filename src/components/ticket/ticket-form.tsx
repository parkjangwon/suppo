"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ticketFormSchema, TicketFormValues } from "@/lib/validation/ticket";
import { AttachmentUpload } from "./attachment-upload";

interface TicketFormProps {
  categories: { id: string; name: string }[];
}

export function TicketForm({ categories }: TicketFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      priority: "MEDIUM",
      captchaToken: process.env.NODE_ENV === "test" ? "test-token" : "",
    },
  });

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              {...register("customerName")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="홍길동"
            />
            {errors.customerName && (
              <p className="mt-1 text-sm text-red-500">{errors.customerName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              id="customerEmail"
              type="email"
              {...register("customerEmail")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="hong@example.com"
            />
            {errors.customerEmail && (
              <p className="mt-1 text-sm text-red-500">{errors.customerEmail.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            id="customerPhone"
            type="tel"
            {...register("customerPhone")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="010-1234-5678"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              {...register("categoryId")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
            >
              <option value="">선택해주세요</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-500">{errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              우선순위 <span className="text-red-500">*</span>
            </label>
            <select
              id="priority"
              {...register("priority")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
            >
              <option value="LOW">낮음</option>
              <option value="MEDIUM">보통</option>
              <option value="HIGH">높음</option>
              <option value="URGENT">긴급</option>
            </select>
            {errors.priority && (
              <p className="mt-1 text-sm text-red-500">{errors.priority.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            {...register("subject")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="문의 제목을 입력해주세요"
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-500">{errors.subject.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
            placeholder="문의 내용을 상세히 입력해주세요 (최소 20자)"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            첨부파일
          </label>
          <AttachmentUpload files={files} onChange={setFiles} />
        </div>

        {process.env.NODE_ENV !== "test" && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 mb-2">
              개발 환경에서는 아래 버튼을 클릭하여 캡챠를 우회할 수 있습니다.
            </p>
            <button 
              type="button" 
              onClick={() => {
                setValue("captchaToken", "dev-token-bypass");
                alert("개발용 캡챠 토큰이 설정되었습니다. 티켓을 제출하세요.");
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              개발 환경 캡챠 우회하기
            </button>
          </div>
        )}
        {errors.captchaToken && (
          <p className="mt-1 text-sm text-red-500">CAPTCHA를 완료해주세요</p>
        )}
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "제출 중..." : "티켓 제출"}
        </button>
      </div>
    </form>
  );
}
