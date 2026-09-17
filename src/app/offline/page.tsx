"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="text-5xl font-bold text-muted-foreground">오프라인</div>
      <p className="text-sm text-muted-foreground">
        인터넷 연결이 필요합니다.
        <br />
        연결 후 다시 시도해주세요.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground"
      >
        다시 시도
      </button>
    </div>
  );
}