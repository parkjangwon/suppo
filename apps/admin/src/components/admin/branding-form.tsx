"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@crinity/ui/components/ui/button";
import { Input } from "@crinity/ui/components/ui/input";
import { Label } from "@crinity/ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { Switch } from "@crinity/ui/components/ui/switch";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { formatPhoneNumberInput } from "@crinity/shared/utils/phone-format";
import { toast } from "sonner";

interface SystemBranding {
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  homepageTitle: string;
  homepageSubtitle: string;
  adminPanelTitle: string;
  appTitle: string;
  welcomeMessage: string;
  footerText: string;
  footerPhone?: string;
  footerEmail?: string;
  footerHomepage?: string;
  footerAddress?: string;
  showPoweredBy: boolean;
  knowledgeEnabled: boolean;
  customCss?: string;
}

const defaultFormData: SystemBranding = {
  companyName: "Crinity",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#0f172a",
  secondaryColor: "#3b82f6",
  homepageTitle: "Crinity Helpdesk",
  homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
  adminPanelTitle: "Crinity Admin",
  appTitle: "고객 지원 센터",
  welcomeMessage: "무엇을 도와드릴까요?",
  footerText: "© 2024 All rights reserved.",
  footerPhone: "",
  footerEmail: "",
  footerHomepage: "",
  footerAddress: "",
  showPoweredBy: true,
  knowledgeEnabled: true,
  customCss: "",
};

export function BrandingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [formData, setFormData] = useState<SystemBranding>(defaultFormData);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/branding");
      if (response.ok) {
        const data = await response.json();
        setFormData({
          companyName: data.companyName || defaultFormData.companyName,
          logoUrl: data.logoUrl || "",
          faviconUrl: data.faviconUrl || "",
          primaryColor: data.primaryColor || defaultFormData.primaryColor,
          secondaryColor: data.secondaryColor || defaultFormData.secondaryColor,
          homepageTitle: data.homepageTitle || defaultFormData.homepageTitle,
          homepageSubtitle: data.homepageSubtitle || defaultFormData.homepageSubtitle,
          adminPanelTitle: data.adminPanelTitle || defaultFormData.adminPanelTitle,
          appTitle: data.appTitle || defaultFormData.appTitle,
          welcomeMessage: data.welcomeMessage || defaultFormData.welcomeMessage,
          footerText: data.footerText || defaultFormData.footerText,
          footerPhone: data.footerPhone || "",
          footerEmail: data.footerEmail || "",
          footerHomepage: data.footerHomepage || "",
          footerAddress: data.footerAddress || "",
          showPoweredBy: data.showPoweredBy ?? true,
          knowledgeEnabled: data.knowledgeEnabled ?? true,
          customCss: data.customCss || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch branding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    type: "logo" | "favicon"
  ): Promise<string | null> => {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("type", type);

    try {
      const response = await fetch("/api/admin/branding/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("파일 업로드에 실패했습니다.");
      return null;
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const url = await handleFileUpload(file, "logo");
    if (url) {
      setFormData((prev) => ({ ...prev, logoUrl: url }));
    }
    setUploadingLogo(false);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleFaviconChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFavicon(true);
    const url = await handleFileUpload(file, "favicon");
    if (url) {
      setFormData((prev) => ({ ...prev, faviconUrl: url }));
    }
    setUploadingFavicon(false);
    if (faviconInputRef.current) {
      faviconInputRef.current.value = "";
    }
  };

  const clearLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: "" }));
  };

  const clearFavicon = () => {
    setFormData((prev) => ({ ...prev, faviconUrl: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Clean up form data - convert empty strings to undefined
    const cleanedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ])
    );

    try {
      const response = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      if (response.ok) {
        toast.success("브랜딩 설정이 저장되었습니다.");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Server error:", errorData);
        throw new Error(errorData.error || `Failed to save: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to save branding:", error);
      toast.error("브랜딩 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">회사명 *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, companyName: e.target.value }))
              }
              placeholder="회사명을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="homepageTitle">홈페이지 메인 제목</Label>
            <Input
              id="homepageTitle"
              value={formData.homepageTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, homepageTitle: e.target.value }))
              }
              placeholder="Crinity Helpdesk"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="homepageSubtitle">홈페이지 부제목</Label>
            <Input
              id="homepageSubtitle"
              value={formData.homepageSubtitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, homepageSubtitle: e.target.value }))
              }
              placeholder="민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPanelTitle">관리자 패널 제목</Label>
            <Input
              id="adminPanelTitle"
              value={formData.adminPanelTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, adminPanelTitle: e.target.value }))
              }
              placeholder="Crinity Admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appTitle">앱 제목</Label>
            <Input
              id="appTitle"
              value={formData.appTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, appTitle: e.target.value }))
              }
              placeholder="고객 지원 센터"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">환영 메시지</Label>
            <Input
              id="welcomeMessage"
              value={formData.welcomeMessage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  welcomeMessage: e.target.value,
                }))
              }
              placeholder="무엇을 도와드릴까요?"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>로고 및 파비콘</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>로고</Label>
              <div className="space-y-2">
                {formData.logoUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-20 w-auto object-contain border rounded p-2"
                    />
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {uploadingLogo ? "업로드 중..." : "클릭하여 업로드"}
                    </span>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                {!formData.logoUrl && (
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF, SVG, WebP (최대 5MB)
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>파비콘</Label>
              <div className="space-y-2">
                {formData.faviconUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.faviconUrl}
                      alt="Favicon preview"
                      className="h-12 w-12 object-contain border rounded p-1"
                    />
                    <button
                      type="button"
                      onClick={clearFavicon}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => faviconInputRef.current?.click()}
                    className="h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {uploadingFavicon ? "업로드 중..." : "클릭하여 업로드"}
                    </span>
                  </div>
                )}
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconChange}
                  className="hidden"
                />
                {!formData.faviconUrl && (
                  <p className="text-xs text-muted-foreground">
                    ICO, PNG, JPG, SVG (최대 5MB)
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>색상 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">주 색상</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="w-16"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  placeholder="#0f172a"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">보조 색상</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value,
                    }))
                  }
                  className="w-16"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value,
                    }))
                  }
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>푸터 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footerText">푸터 텍스트</Label>
            <Input
              id="footerText"
              value={formData.footerText}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, footerText: e.target.value }))
              }
              placeholder="© 2024 All rights reserved."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="footerPhone">전화번호</Label>
              <Input
                id="footerPhone"
                value={formData.footerPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footerPhone: formatPhoneNumberInput(e.target.value),
                  }))
                }
                placeholder="02-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerEmail">이메일</Label>
              <Input
                id="footerEmail"
                type="email"
                value={formData.footerEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footerEmail: e.target.value,
                  }))
                }
                placeholder="support@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="footerHomepage">홈페이지</Label>
              <Input
                id="footerHomepage"
                type="url"
                value={formData.footerHomepage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footerHomepage: e.target.value,
                  }))
                }
                placeholder="https://www.company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerAddress">주소</Label>
              <Input
                id="footerAddress"
                value={formData.footerAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footerAddress: e.target.value,
                  }))
                }
                placeholder="서울특별시 강남구 ..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>고급 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="knowledgeEnabled"
              checked={formData.knowledgeEnabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, knowledgeEnabled: checked }))
              }
            />
            <div>
              <Label htmlFor="knowledgeEnabled">지식 찾기 공개 포털 노출</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                비활성화 시 고객 포털에서 지식 찾기 메뉴와 페이지가 숨겨집니다.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="showPoweredBy"
              checked={formData.showPoweredBy}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, showPoweredBy: checked }))
              }
            />
            <Label htmlFor="showPoweredBy">Powered by Crinity 표시</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customCss">커스텀 CSS</Label>
            <textarea
              id="customCss"
              value={formData.customCss}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customCss: e.target.value }))
              }
              placeholder="/* 커스텀 CSS를 입력하세요 */"
              className="w-full h-32 p-3 border rounded-md font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving} size="lg">
          {isSaving ? "저장 중..." : "설정 저장"}
        </Button>
      </div>
    </form>
  );
}
