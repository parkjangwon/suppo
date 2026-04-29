"use client";

import { useState } from "react";
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { Plus, Edit2, Trash2, Power, PowerOff, Copy, Download } from "lucide-react";
import { Button } from "@suppo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { Input } from "@suppo/ui/components/ui/input";
import { Label } from "@suppo/ui/components/ui/label";
import { Textarea } from "@suppo/ui/components/ui/textarea";
import { Switch } from "@suppo/ui/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@suppo/ui/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@suppo/ui/components/ui/alert-dialog";
import { Badge } from "@suppo/ui/components/ui/badge";
import { toast } from "sonner";
import { copyText } from "@/lib/i18n/admin-copy-utils";

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
  createdAt: string | Date;
  updatedAt: string | Date;
};

interface SAMLProviderFormProps {
  providers: SAMLProvider[];
  baseUrl: string;
}

export function SAMLProviderForm({ providers: initialProviders, baseUrl }: SAMLProviderFormProps) {
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
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
        throw new Error(error.message || t("commonSaveFailed", "저장에 실패했습니다", "Failed to save."));
      }

      const savedProvider = await response.json();

      if (editingProvider) {
        setProviders(providers.map((p) => (p.id === savedProvider.id ? savedProvider : p)));
        setEditingProvider(null);
        toast.success(t("samlProviderUpdateSuccess", "SAML Provider가 수정되었습니다", "SAML provider updated."));
      } else {
        setProviders([savedProvider, ...providers]);
        setIsCreateOpen(false);
        resetForm();
        toast.success(t("samlProviderCreateSuccess", "SAML Provider가 생성되었습니다", "SAML provider created."));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.commonError);
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
        throw new Error(t("commonDeleteFailed", "삭제에 실패했습니다", "Failed to delete."));
      }

      setProviders(providers.filter((p) => p.id !== deletingProvider.id));
      toast.success(t("samlProviderDeleteSuccess", "SAML Provider가 삭제되었습니다", "SAML provider deleted."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.commonError);
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
        throw new Error(t("samlProviderStatusFailed", "상태 변경에 실패했습니다", "Failed to change status."));
      }

      const updated = await response.json();
      setProviders(providers.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.isActive ? t("commonActivate", "활성화되었습니다", "Activated.") : t("commonDeactivate", "비활성화되었습니다", "Deactivated."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.commonError);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("commonCopiedLabel", `${label}이(가) 복사되었습니다`, `${label} copied.`));
  };

  const downloadMetadata = (provider: SAMLProvider) => {
    const metadata = generateSPMetadata(provider, baseUrl);
    const blob = new Blob([metadata], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppo-sp-metadata-${provider.domain}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("samlMetaDownloadSuccess", "메타데이터 파일이 다운로드되었습니다", "Metadata file downloaded."));
  };

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {t("samlProviderCount", `총 ${providers.length}개의 SAML Provider`, `${providers.length} SAML providers`)}
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {t("samlProviderAdd", "SAML Provider 추가", "Add SAML provider")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("samlProviderCreateTitle", "새 SAML Provider 생성", "Create SAML provider")}</DialogTitle>
            </DialogHeader>
            <SAMLProviderFormFields
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel={copy.commonCreate}
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
                    <p className="text-sm text-gray-600">{t("commonDomain", "도메인", "Domain")}: {provider.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(provider)}
                      title={provider.isActive ? t("commonDeactivate", "비활성화", "Deactivate") : t("commonActivate", "활성화", "Activate")}
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
                      title={t("samlProviderDownloadMetadata", "SP 메타데이터 다운로드", "Download SP metadata")}
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
                          <DialogTitle>{t("samlProviderEditTitle", "SAML Provider 수정", "Edit SAML provider")}</DialogTitle>
                        </DialogHeader>
                        <SAMLProviderFormFields
                          formData={formData}
                          setFormData={setFormData}
                          onSubmit={handleSubmit}
                          isSubmitting={isSubmitting}
                          submitLabel={copy.commonSave}
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
                      <Label className="text-xs text-gray-500">{t("samlIdpEntityId", "IdP Entity ID", "IdP entity ID")}</Label>
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
                      <Label className="text-xs text-gray-500">{t("samlSpAcsUrl", "SP ACS URL", "SP ACS URL")}</Label>
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
                    <span>{t("samlSpEntityId", "SP Entity ID", "SP entity ID")}: {provider.spEntityId}</span>
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
            <AlertDialogTitle>{t("samlProviderDeleteTitle", "SAML Provider 삭제", "Delete SAML provider")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("samlProviderDeleteConfirm", `${deletingProvider?.name} (${deletingProvider?.domain})을(를) 삭제하시겠습니까?`, `Delete ${deletingProvider?.name} (${deletingProvider?.domain})?`)}
              <br />
              {t("commonIrreversible", "이 작업은 되돌릴 수 없습니다.", "This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.commonCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              {copy.commonDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type SAMLProviderFormData = {
  name: string;
  domain: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl: string;
  idpCertificate: string;
  isActive: boolean;
};

interface SAMLProviderFormFieldsProps {
  formData: SAMLProviderFormData;
  setFormData: (data: SAMLProviderFormData) => void;
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
  const copy = useAdminCopy();
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const spEntityId = `${baseUrl}/api/auth/saml/${formData.domain}`;
  const spAcsUrl = `${baseUrl}/api/auth/callback/boxyhq-saml`;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">{t("commonBasicInfo", "기본 정보", "Basic information")}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("brandingCompanyLabel", "회사명", "Company name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("samlCompanyPlaceholder", "예: ACME Corporation", "e.g. ACME Corporation")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">
              {t("samlEmailDomain", "이메일 도메인", "Email domain")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
              placeholder={t("samlDomainPlaceholder", "예: acme.com", "e.g. acme.com")}
              required
              disabled={isEditing}
              pattern="^[a-z0-9][-a-z0-9]*\.[-a-z0-9]+$"
              title={t("samlDomainTitle", "유효한 도메인을 입력하세요 (예: acme.com)", "Enter a valid domain (e.g. acme.com)")}
            />
            <p className="text-xs text-gray-500">
              {t("samlDomainHelp", "이 도메인의 이메일을 가진 사용자가 SAML로 로그인할 수 있습니다", "Users with email addresses on this domain can sign in with SAML.")}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label htmlFor="isActive">{t("commonActivate", "활성화", "Activate")}</Label>
        </div>
      </div>

      {/* SP Configuration (Read-only) */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">{t("samlSpSettings", "Service Provider (SP) 설정", "Service Provider (SP) settings")}</h4>
        <p className="text-sm text-gray-600">
          {t("samlSpHelp", "아래 정보를 IdP 관리자에게 제공하세요.", "Share the following information with your IdP administrator.")}
        </p>
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs">{t("samlSpEntityId", "SP Entity ID", "SP entity ID")}</Label>
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
            <Label className="text-xs">{t("samlSpAcsUrlLong", "ACS URL (Assertion Consumer Service)", "ACS URL (Assertion Consumer Service)")}</Label>
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
        <h4 className="font-medium text-sm text-gray-900">{t("samlIdpSettings", "Identity Provider (IdP) 설정", "Identity Provider (IdP) settings")}</h4>
        <p className="text-sm text-gray-600">
          {t("samlIdpHelp", "IdP에서 제공하는 정보를 입력하세요.", "Enter the information provided by your IdP.")}
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idpEntityId">
              {t("samlIdpEntityId", "IdP Entity ID", "IdP entity ID")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="idpEntityId"
              value={formData.idpEntityId}
              onChange={(e) => setFormData({ ...formData, idpEntityId: e.target.value })}
              placeholder={t("samlMetadataPlaceholder", "예: https://idp.example.com/metadata", "e.g. https://idp.example.com/metadata")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idpSsoUrl">
              {t("samlSsoUrl", "SSO URL (Single Sign-On)", "SSO URL (Single Sign-On)")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="idpSsoUrl"
              value={formData.idpSsoUrl}
              onChange={(e) => setFormData({ ...formData, idpSsoUrl: e.target.value })}
              placeholder={t("samlSsoPlaceholder", "예: https://idp.example.com/sso", "e.g. https://idp.example.com/sso")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idpSloUrl">{t("samlSloUrl", "SLO URL (Single Logout) - 선택사항", "SLO URL (Single Logout) - optional")}</Label>
            <Input
              id="idpSloUrl"
              value={formData.idpSloUrl}
              onChange={(e) => setFormData({ ...formData, idpSloUrl: e.target.value })}
              placeholder={t("samlSloPlaceholder", "예: https://idp.example.com/slo", "e.g. https://idp.example.com/slo")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idpCertificate">
              {t("samlCertificate", "X.509 Certificate", "X.509 certificate")} <span className="text-red-500">*</span>
              {isEditing && <span className="text-gray-500 font-normal"> {t("samlCertificateEditHint", "(변경 시에만 입력)", "(only when changing)")}</span>}
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
              {t("samlCertificateHelp", "IdP의 공개 인증서를 PEM 형식으로 입력하세요", "Enter the IdP public certificate in PEM format.")}
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? copy.commonSaving : submitLabel}
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
