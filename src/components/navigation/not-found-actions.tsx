"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function NotFoundBackButton() {
  const router = useRouter();

  return (
    <Button
      className="w-full"
      onClick={() => router.back()}
      type="button"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      이전 화면
    </Button>
  );
}
