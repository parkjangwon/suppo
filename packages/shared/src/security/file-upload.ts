/**
 * 파일 업로드 보안
 * - 파일 확장자 검증
 * - 파일 매직 넘버(시그니처) 확인
 * - 악의적인 파일 탐지
 */

// 허용된 파일 확장자
const ALLOWED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".pdf",
  ".doc", ".docx",
  ".xls", ".xlsx",
  ".txt", ".csv",
  ".zip",
]);

const OLE2_SIGNATURE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]);
const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const ZIP_SIGNATURES = [
  new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
  new Uint8Array([0x50, 0x4b, 0x07, 0x08]),
];

// 위험한 파일 이름 패턴
const DANGEROUS_FILENAME_PATTERNS = [
  /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|dll|so|dylib)$/i,
  /^con$|^prn$|^aux$|^nul$/i, // Windows 예약 파일명
  /\.+\//, // Path traversal
  /\.\./, // Directory traversal
];

// 위험한 파일 내용 패턴
const MALICIOUS_CONTENT_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gis,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload= 등
  /eval\s*\(/gi,
  /<\?php/i,
  /<%\s*/i,
  /<\!/i,
];

async function readFileHeader(file: File, length: number): Promise<Uint8Array> {
  const blob = typeof file.slice === "function" ? file.slice(0, length) : file;

  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }

  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer()).slice(0, length);
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
          return;
        }

        reject(new Error("Unable to read file header"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file header"));
      reader.readAsArrayBuffer(blob);
    });
  }

  throw new Error("Unable to read file header");
}

/**
 * 파일 확장자 검증
 */
export function validateFileExtension(fileName: string): boolean {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.has(extension);
}

/**
 * 파일 이름 안전성 검증
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  // 파일 길이 제한
  if (fileName.length > 255) {
    return { valid: false, error: "파일 이름이 너무 깁니다" };
  }

  // 위험한 패턴 검사
  for (const pattern of DANGEROUS_FILENAME_PATTERNS) {
    if (pattern.test(fileName)) {
      return { valid: false, error: "허용되지 않는 파일 이름입니다" };
    }
  }

  // null 바이트 검사 (경로 탐색 방지)
  if (fileName.includes("\0")) {
    return { valid: false, error: "허용되지 않는 파일 이름입니다" };
  }

  return { valid: true };
}

/**
 * 파일 매직 넘버 확인 (파일 실제 형식 검증)
 */
export async function verifyFileSignature(file: File, expectedMimeType: string): Promise<boolean> {
  try {
    if (expectedMimeType === "text/plain" || expectedMimeType === "text/csv") {
      return true;
    }

    const bytes = await readFileHeader(file, 12);

    const startsWith = (signature: Uint8Array) => {
      if (bytes.length < signature.length) {
        return false;
      }

      for (let index = 0; index < signature.length; index += 1) {
        if (bytes[index] !== signature[index]) {
          return false;
        }
      }

      return true;
    };

    if (expectedMimeType === "image/png") {
      return startsWith(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    }

    if (expectedMimeType === "image/jpeg") {
      return startsWith(new Uint8Array([0xff, 0xd8, 0xff]));
    }

    if (expectedMimeType === "image/gif") {
      return startsWith(new Uint8Array([0x47, 0x49, 0x46]));
    }

    if (expectedMimeType === "image/webp") {
      return (
        startsWith(new Uint8Array([0x52, 0x49, 0x46, 0x46])) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    }

    if (expectedMimeType === "application/pdf") {
      return startsWith(PDF_SIGNATURE);
    }

    if (
      expectedMimeType === "application/zip" ||
      expectedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      expectedMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return ZIP_SIGNATURES.some(startsWith);
    }

    if (
      expectedMimeType === "application/msword" ||
      expectedMimeType === "application/vnd.ms-excel"
    ) {
      return startsWith(OLE2_SIGNATURE);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 파일 내용 검사 (스크립트 주입 방지)
 */
export async function scanFileContent(file: File): Promise<{ safe: boolean; threat?: string }> {
  // 이미지 파일은 검사 건너뜀
  if (file.type.startsWith("image/")) {
    return { safe: true };
  }

  // 텍스트 기반 파일만 검사
  const textMimeTypes = ["text/plain", "text/csv", "application/json"];
  if (!textMimeTypes.includes(file.type)) {
    return { safe: true };
  }

  try {
    const text = await file.text();

    for (const pattern of MALICIOUS_CONTENT_PATTERNS) {
      if (pattern.test(text)) {
        return { safe: false, threat: "악의적인 콘텐츠가 감지되었습니다" };
      }
    }

    return { safe: true };
  } catch {
    return { safe: true };
  }
}

/**
 * 전체 파일 검증
 */
export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // 파일 크기 확인 (10MB 제한)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "파일 크기는 10MB를 초과할 수 없습니다" };
  }

  // 파일 이름 검증
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // 파일 확장자 검증
  if (!validateFileExtension(file.name)) {
    return { valid: false, error: "허용되지 않는 파일 형식입니다" };
  }

  // MIME 타입 검증
  const allowedMimeTypes = [
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
    "application/zip",
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: "허용되지 않는 파일 형식입니다" };
  }

  // 파일 매직 넘버 검증
  const signatureValid = await verifyFileSignature(file, file.type);
  if (!signatureValid) {
    return { valid: false, error: "파일 형식이 일치하지 않습니다" };
  }

  // 악의적인 콘텐츠 검사
  const contentScan = await scanFileContent(file);
  if (!contentScan.safe) {
    return { valid: false, error: contentScan.threat };
  }

  return { valid: true };
}

/**
 * 안전한 파일 이름 생성
 */
export function generateSafeFileName(originalName: string, uuid: string): string {
  const extension = originalName.slice(originalName.lastIndexOf("."));
  const baseName = originalName.slice(0, originalName.lastIndexOf("."));

  // 위험한 문자 제거
  const sanitized = baseName
    .replace(/[<>:"|?*]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 100); // 이름 길이 제한

  return `${uuid}-${sanitized}${extension}`;
}
