// 한국식 한글 금액 표기 변환
// 예: 1,200,000 -> 일백이십만원 / 금 일백이십만원 정 / 금 1,200,000원 (1,200,000)
const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

// 십진 단위
const SMALL_UNITS = ["", "십", "백", "천"];
// 그룹 단위 (만, 억, 조, 경)
const GROUP_UNITS = ["", "만", "억", "조", "경"];

function fourDigitsToString(n: number): string {
  // 0~9999 을 한글 숫자로
  if (n === 0) return "";
  let s = "";
  for (let i = 3; i >= 0; i--) {
    const place = Math.floor(n / Math.pow(10, i));
    if (place === 0) continue;
    const digit = DIGITS[place];
    const unit = SMALL_UNITS[i];
    if (place === 1 && i > 0) {
      s += unit; // 10->십, 100->백, 1000->천
    } else {
      s += digit + unit;
    }
    n = n % Math.pow(10, i);
  }
  return s;
}

export function numberToKoreanWon(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (amount === 0) return "영원";

  let result = "";
  let groupIndex = 0;
  let n = Math.floor(amount);

  while (n > 0) {
    const group = n % 10000;
    const part = fourDigitsToString(group);
    if (part) {
      result = part + GROUP_UNITS[groupIndex] + result;
    }
    n = Math.floor(n / 10000);
    groupIndex++;
  }

  return result + "원";
}

// 공식 문서용: 금 일백이십만원 정
export function amountToTextFormal(amount: number): string {
  return `금 ${numberToKoreanWon(amount)} 정`;
}

// 예: 금 1,200,000원 (일백이십만원)
export function amountDisplayWithKorean(amount: number): string {
  return `금 ${amount.toLocaleString("ko-KR")}원 (${numberToKoreanWon(amount)})`;
}