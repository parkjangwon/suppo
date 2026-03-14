"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Power, PowerOff, Copy, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type SAMLProvider = {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl?: string | null;
  spAcsUrl: string;
  spEntityId: string;
  createdAt: string;
  updatedAt: string;
};

interface SAMLProviderFormProps {
  providers: SAMLProvider[];
  baseUrl: string;
}

export function SAMLProviderForm({ providers: initialProviders, baseUrl }: SAMLProviderFormProps) {
  const [providers, setProviders] = useState<SAMLProvider[]>(initialProviders);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SAMLProvider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<SAMLProvider | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    idpEntityId: "",
    idpSsoUrl: "",
    idpSloUrl: "",
    idpCertificate: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      domain: "",
      idpEntityId: "",
      idpSsoUrl: "",
      idpSloUrl: "",
      idpCertificate: "",
      isActive: true,
    });
  };

  const handleEdit = (provider: SAMLProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      domain: provider.domain,
      idpEntityId: provider.idpEntityId,
      idpSsoUrl: provider.idpSsoUrl,
      idpSloUrl: provider.idpSloUrl || "",
      idpCertificate: "",
      isActive: provider.isActive,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingProvider
        ? `/api/admin/saml-providers/${editingProvider.id}`
        : "/api/admin/saml-providers";
      const method = editingProvider ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "저장에 실패했습니다");
      }

      const savedProvider = await response.json();

      if (editingProvider) {
        setProviders(providers.map((p) => (p.id === savedProvider.id ? savedProvider : p)));
        setEditingProvider(null);
        toast.success("SAML Provider가 수정되었습니다");
      } else {
        setProviders([savedProvider, ...providers]);
        setIsCreateOpen(false);
        resetForm();
        toast.success("SAML Provider가 생성되었습니다");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProvider) return;

    try {
      const response = await fetch(`/api/admin/saml-providers/${deletingProvider.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("삭제에 실패했습니다");
      }

      setProviders(providers.filter((p) => p.id !== deletingProvider.id));
      toast.success("SAML Provider가 삭제되었습니다");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다");
    } finally {
      setDeletingProvider(null);
    }
  };

  const handleToggleActive = async (provider: SAMLProvider) => {
    try {
      const response = await fetch(`/api/admin/saml-providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });

      if (!response.ok) {
        throw new Error("상태 변경에 실패했습니다");
      }

      const updated = await response.json();
      setProviders(providers.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.isActive ? "활성화되었습니다" : "비활성화되었습니다");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}이(가) 복사되었습니다`);
  };

  const downloadMetadata = (provider: SAMLProvider) => {
    const metadata = generateSPMetadata(provider, baseUrl);
    const blob = new Blob([metadata], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crinity-sp-metadata-${provider.domain}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("메타데이터 파일이 다운로드되었습니다");
  };

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          총 {providers.length}개의 SAML Provider
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              SAML Provider 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 SAML Provider 생성</DialogTitle>
            </DialogHeader>
            <SAMLProviderFormFields
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="생성"
              baseUrl={baseUrl}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Providers List */}
      <div className="grid gap-4">
        {providers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              등록된 SAML Provider가 없습니다
            </CardContent>
          </Card>
        ) : (
          providers.map((provider) => (
            <Card key={provider.id} className={!provider.isActive ? "opacity-75" : ""}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <Badge variant={provider.isActive ? "default" : "secondary"}>
                        {provider.isActive ? "활성" : "비활성"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">도메인: {provider.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(provider)}
                      title={provider.isActive ? "비활성화" : "활성화"}
                    >
                      {provider.isActive ? (
                        <Power className="w-4 h-4 text-green-500" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadMetadata(provider)}
                      title="SP 메타데이터 다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Dialog open={editingProvider?.id === provider.id} onOpenChange={(open) => !open && setEditingProvider(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>SAML Provider 수정</DialogTitle>
                        </DialogHeader>
                        <SAMLProviderFormFields
                          formData={formData}
                          setFormData={setFormData}
                          onSubmit={handleSubmit}
                          isSubmitting={isSubmitting}
                          submitLabel="저장"
                          baseUrl={baseUrl}
                          isEditing
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingProvider(provider)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">IdP Entity ID</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-xs truncate">
                          {provider.idpEntityId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(provider.idpEntityId, "Entity ID")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">SP ACS URL</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-xs truncate">
                          {provider.spAcsUrl}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(provider.spAcsUrl, "ACS URL")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>SP Entity ID: {provider.spEntityId}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyToClipboard(provider.spEntityId, "SP Entity ID")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProvider} onOpenChange={() => setDeletingProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>SAML Provider 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProvider?.name} ({deletingProvider?.domain})을(를) 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SAMLProviderFormFieldsProps {
  formData: {
    name: string;
    domain: string;
    idpEntityId: string;
    idpSsoUrl: string;
    idpSloUrl: string;
    idpCertificate: string;
    isActive: boolean;
  };
  setFormData: (data: typeof formData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
  baseUrl: string;
  isEditing?: boolean;
}

function SAMLProviderFormFields({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  submitLabel,
  baseUrl,
  isEditing,
}: SAMLProviderFormFieldsProps) {
  const spEntityId = `${baseUrl}/api/auth/saml/${formData.domain}`;
  const spAcsUrl = `${baseUrl}/api/auth/callback/boxyhq-saml`;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">기본 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              회사명 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: ACME Corporation"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">
              이메일 도메인 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
              placeholder="예: acme.com"
              required
              disabled={isEditing}
              pattern="^[a-z0-9][-a-z0-9]*\.[-a-z0-9]+$"
              title="유효한 도메인을 입력하세요 (예: acme.com)"
            />
            <p className="text-xs text-gray-500">
              이 도메인의 이메일을 가진 사용자가 SAML로 로그인할 수 있습니다
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label htmlFor="isActive">활성화</Label>
        </div>
      </div>

      {/* SP Configuration (Read-only) */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Service Provider (SP) 설정</h4>
        <p className="text-sm text-gray-600">
          아래 정보를 IdP 관리자에게 제공하세요.
        </p>
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs">SP Entity ID</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm truncate">
                {spEntityId}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(spEntityId)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ACS URL (Assertion Consumer Service)</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm truncate">
                {spAcsUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(spAcsUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* IdP Configuration */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Identity Provider (IdP) 설정</h4>
        <p className="text-sm text-gray-600">
          IdP에서 제공하는 정보를 입력하세요.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idpEntityId">
              IdP Entity ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="idpEntityId"
              value={formData.idpEntityId}
              onChange={(e) => setFormData({ ...formData, idpEntityId: e.target.value })}
              placeholder="예: https://idp.example.com/metadata"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idpSsoUrl">
              SSO URL (Single Sign-On) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="idpSsoUrl"
              value={formData.idpSsoUrl}
              onChange={(e) => setFormData({ ...formData, idpSsoUrl: e.target.value })}
              placeholder="예: https://idp.example.com/sso"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idpSloUrl">SLO URL (Single Logout) - 선택사항</Label>
            <Input
              id="idpSloUrl"
              value={formData.idpSloUrl}
              onChange={(e) => setFormData({ ...formData, idpSloUrl: e.target.value })}
              placeholder="예: https://idp.example.com/slo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idpCertificate">
              X.509 Certificate <span className="text-red-500">*</span>
              {isEditing && <span className="text-gray-500 font-normal"> (변경 시에만 입력)</span>}
            </Label>
            <Textarea
              id="idpCertificate"
              value={formData.idpCertificate}
              onChange={(e) => setFormData({ ...formData, idpCertificate: e.target.value })}
              placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiU...&#10;-----END CERTIFICATE-----"
              rows={6}
              required={!isEditing}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              IdP의 공개 인증서를 PEM 형식으로 입력하세요
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "저장 중..." : submitLabel}
      </Button>
    </form>
  );
}

function generateSPMetadata(provider: SAMLProvider, baseUrl: string): string {
  const entityId = `${baseUrl}/api/auth/saml/${provider.domain}`;
  const acsUrl = `${baseUrl}/api/auth/callback/boxyhq-saml`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" 
      Location="${acsUrl}" 
      index="0" 
      isDefault="true"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="ko">${provider.name}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="ko">${provider.name}</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="ko">${baseUrl}</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;
}
