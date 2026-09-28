export type SpeechCard = {
  scheduleName?: string | null;
  startText?: string | null;
  departureLocation?: string | null;
  arrivalLocation?: string | null;
  plateNumber?: string | null;
  guideName?: string | null;
  driverName?: string | null;
  specialConditions?: string | null;
  stops?: string[] | null;
};

export function buildDriverSpeech(c: SpeechCard): string {
  const parts: string[] = ["배차 안내입니다."];
  if (c.scheduleName) parts.push(`일정, ${cut(c.scheduleName)}`);
  if (c.startText) parts.push(`출발 시각, ${c.startText}`);
  if (c.departureLocation) parts.push(`출발지, ${cut(c.departureLocation)}`);
  if (Array.isArray(c.stops) && c.stops.length > 0) {
    parts.push(`중간 정차, ${c.stops.length}곳. ${c.stops.map((s) => cut(s)).join(", ")}`);
  }
  if (c.arrivalLocation) parts.push(`도착지, ${cut(c.arrivalLocation)}`);
  if (c.plateNumber) parts.push(`차량 번호, ${plateToKorean(c.plateNumber)}`);
  if (c.guideName && c.guideName !== "-") parts.push(`동승 가이드, ${cut(c.guideName)}`);
  if (c.driverName && c.driverName !== "-") parts.push(`운행 기사, ${cut(c.driverName)}`);
  if (c.specialConditions && c.specialConditions.trim()) {
    parts.push(`특이사항, ${cut(c.specialConditions)}`);
  }
  parts.push("안전 운행 부탁드립니다.");
  return parts.join(". ");
}

function cut(s: string): string {
  const t = String(s).trim();
  return t.length > 60 ? t.slice(0, 60) + " 외" : t;
}

function plateToKorean(plate: string): string {
  const t = String(plate).trim();
  const m = t.match(/^(\d{2,3})([가-힣]{1,2})(\d{4})$/);
  if (m) {
    return `${m[1]} ${m[2]} ${m[3]}`;
  }
  return t.replace(/(\d)([가-힣])/, "$1 $2");
}