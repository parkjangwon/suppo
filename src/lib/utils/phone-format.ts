/**
 * 전화번호를 한국식 형식으로 포맷팅
 * @param phoneNumber - 원본 전화번호 (숫자와 하이픈 혼합 가능)
 * @returns 포맷팅된 전화번호
 * 
 * 예시:
 * - 01012345678 -> 010-1234-5678
 * - 0212345678 -> 02-1234-5678
 * - 0311234567 -> 031-123-4567
 * - 15881234 -> 1588-1234
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return "";
  
  const digits = phoneNumber.replace(/\D/g, "");
  
  if (digits.length === 0) return phoneNumber;
  
  const length = digits.length;
  
  // 휴대폰 (010)
  if (digits.startsWith("01")) {
    if (length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
  }
  
  // 서울 (02)
  if (digits.startsWith("02")) {
    if (length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    if (length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  }
  
  // 지역번호 (031, 032, 033, 041, 042, 043, 044, 051, 052, 053, 054, 055, 061, 062, 063, 064)
  if (length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  
  // 특수번호 (1588, 1599, 1644 등)
  if (length === 8 && (digits.startsWith("15") || digits.startsWith("16") || digits.startsWith("18"))) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  
  // 기타: 4자리씩 나누기
  if (length > 8) {
    const parts: string[] = [];
    for (let i = 0; i < length; i += 4) {
      parts.push(digits.slice(i, Math.min(i + 4, length)));
    }
    return parts.join("-");
  }
  
  // 7-8자리: 3-4 또는 4-4
  if (length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  
  // 기본: 원본 반환
  return phoneNumber;
}

/**
 * 입력 중인 전화번호 실시간 포맷팅
 * @param value - 현재 입력값
 * @returns 포맷팅된 값
 */
export function formatPhoneNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  
  if (digits.length <= 3) return digits;
  
  // 휴대폰 (010)
  if (digits.startsWith("01")) {
    if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  
  // 서울 (02)
  if (digits.startsWith("02")) {
    if (digits.length <= 6) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  
  // 기타 지역
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
