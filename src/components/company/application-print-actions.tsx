"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ApplicationPrintActions() {
  return (
    <Button onClick={() => window.print()} type="button">
      <Printer className="size-4" />
      PDF로 저장
    </Button>
  );
}
