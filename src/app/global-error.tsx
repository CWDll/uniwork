"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
  unstable_retry: unstableRetry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstableRetry ?? reset;

  return (
    <html lang="ko">
      <body
        style={{
          background: "#f8fafc",
          color: "#020617",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          margin: 0,
        }}
      >
        <main
          style={{
            alignItems: "center",
            display: "flex",
            minHeight: "100vh",
            padding: 24,
          }}
        >
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              margin: "0 auto",
              maxWidth: 640,
              padding: 28,
              width: "100%",
            }}
          >
            <p
              style={{
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.08em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Uniwork error
            </p>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 1.15,
                margin: "12px 0 0",
              }}
            >
              서비스를 불러오지 못했습니다
            </h1>
            <p
              style={{
                color: "#475569",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.7,
                margin: "12px 0 0",
              }}
            >
              일시적인 오류일 수 있습니다. 다시 시도하거나 잠시 후 필요한
              화면으로 이동해주세요.
            </p>
            {error.digest ? (
              <p
                style={{
                  background: "#f8fafc",
                  borderRadius: 10,
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 700,
                  margin: "16px 0 0",
                  overflowWrap: "anywhere",
                  padding: 12,
                }}
              >
                오류 추적 ID: {error.digest}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 24,
              }}
            >
              {retry ? (
                <button
                  onClick={() => retry()}
                  style={{
                    background: "#2563eb",
                    border: 0,
                    borderRadius: 8,
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 800,
                    minHeight: 40,
                    padding: "0 16px",
                  }}
                  type="button"
                >
                  다시 시도
                </button>
              ) : null}
              <Link
                href="/"
                style={{
                  alignItems: "center",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  color: "#0f172a",
                  display: "inline-flex",
                  fontSize: 14,
                  fontWeight: 800,
                  minHeight: 40,
                  padding: "0 16px",
                  textDecoration: "none",
                }}
              >
                홈으로 이동
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
