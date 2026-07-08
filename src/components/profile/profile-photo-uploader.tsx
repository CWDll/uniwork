"use client";

import { Camera, Loader2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { profilePhotoBucket } from "@/lib/profile-photo";
import { createClient } from "@/lib/supabase/browser";

const maxPhotoSize = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

function getFileExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function ProfilePhotoUploader({
  avatarUrl,
  userId,
}: {
  avatarUrl: string | null;
  userId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    if (!allowedTypes.includes(file.type)) {
      setError("JPG, PNG, WebP 이미지만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > maxPhotoSize) {
      setError("프로필 사진은 5MB 이하로 업로드해주세요.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    startTransition(async () => {
      const supabase = createClient();
      const avatarPath = `${userId}/avatar.${getFileExtension(file)}`;
      const { error: uploadError } = await supabase.storage
        .from(profilePhotoBucket)
        .upload(avatarPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_path: avatarPath, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Profile photo"
              className="size-full object-cover"
              src={previewUrl}
            />
          ) : (
            <UserRound className="size-10" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black">프로필 사진</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            구인자가 지원자를 더 쉽게 확인할 수 있도록 얼굴이 잘 보이는 사진을
            등록해주세요.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              ref={inputRef}
              type="file"
            />
            <Button
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {isPending ? "업로드 중..." : "사진 선택"}
            </Button>
            <span className="text-xs font-bold text-slate-400">
              JPG, PNG, WebP · 최대 5MB
            </span>
          </div>
          {error ? (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
