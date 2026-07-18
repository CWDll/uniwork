"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateAdminRequestAction } from "@/app/admin/admin-requests/actions";
import { Button } from "@/components/ui/button";

type PartnerOption = {
  email: string;
  id: string;
  name: string | null;
};

export function AdminRequestUpdateForm({
  assignedPartnerId,
  handoffHoldReason,
  handoffNote,
  handoffRecipientEmail,
  handoffSentAt,
  handoffStatus,
  handoffChannel,
  internalNote,
  memo,
  partners,
  requestId,
  seekerFollowupNote,
  status,
}: {
  assignedPartnerId: string | null;
  handoffHoldReason: string;
  handoffNote: string;
  handoffRecipientEmail: string;
  handoffSentAt: string | null;
  handoffStatus: string;
  handoffChannel: string;
  internalNote: string;
  memo: string | null;
  partners: PartnerOption[];
  requestId: string;
  seekerFollowupNote: string;
  status: string;
}) {
  const [state, formAction] = useActionState(updateAdminRequestAction, {});

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-xl bg-slate-50 p-3 lg:bg-transparent lg:p-0"
      key={`${requestId}-${status}-${handoffStatus}-${assignedPartnerId ?? "none"}`}
    >
      <input name="request_id" type="hidden" value={requestId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Status
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3"
          defaultValue={status}
          name="status"
        >
          <option value="received">접수</option>
          <option value="reviewing">운영자 검토</option>
          <option value="partner_needed">행정사 전달 필요</option>
          <option value="assigned">행정사 배정</option>
          <option value="completed">완료</option>
          <option value="rejected">반려</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        요청자 메모
        <textarea
          className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2"
          defaultValue={memo ?? ""}
          name="memo"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        구직자 보완 요청
        <textarea
          className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2"
          defaultValue={seekerFollowupNote}
          name="seeker_followup_note"
          placeholder="구직자에게 다시 받아야 할 정보나 서류를 적어주세요."
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        내부 메모
        <textarea
          className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2"
          defaultValue={internalNote}
          name="internal_note"
          placeholder="운영팀 내부 확인 사항을 적어주세요."
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        외부 행정사/파트너
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3"
          defaultValue={assignedPartnerId ?? ""}
          name="assigned_partner_id"
        >
          <option value="">미배정</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name || partner.email}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        전달 상태
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3"
          defaultValue={handoffStatus}
          name="handoff_status"
        >
          <option value="not_ready">준비 중</option>
          <option value="ready">전달 준비 완료</option>
          <option value="handed_off">전달 완료</option>
          <option value="paused">보류</option>
        </select>
      </label>
      <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <p className="text-sm font-black text-blue-950">수동 전달 기록</p>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          행정사/외부 담당자 이메일
          <input
            className="h-11 rounded-md border border-slate-200 bg-white px-3"
            defaultValue={handoffRecipientEmail}
            name="handoff_recipient_email"
            placeholder="partner@example.com"
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          전달 채널
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3"
            defaultValue={handoffChannel}
            name="handoff_channel"
          >
            <option value="manual">수동 기록</option>
            <option value="email">이메일</option>
            <option value="phone">전화</option>
            <option value="kakao">카카오/메신저</option>
            <option value="other">기타</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          전달 메모
          <textarea
            className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2"
            defaultValue={handoffNote}
            name="handoff_note"
            placeholder="전달한 파일, 후속 확인 일정, 행정사 답변 대기 내용을 적어주세요."
          />
        </label>
        <label className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
          <input
            className="mt-1 size-4 shrink-0 accent-blue-600"
            defaultChecked={Boolean(handoffSentAt)}
            disabled={Boolean(handoffSentAt)}
            name="mark_handoff_sent"
            type="checkbox"
          />
          <span>
            {handoffSentAt
              ? `전달 완료 기록됨: ${new Date(handoffSentAt).toLocaleString("ko-KR")}`
              : "이번 저장 시 외부 전달 완료로 기록"}
          </span>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        전달 보류/확인 사유
        <textarea
          className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2"
          defaultValue={handoffHoldReason}
          name="handoff_hold_reason"
          placeholder="전달을 보류하거나 추가 확인이 필요한 이유를 적어주세요."
        />
      </label>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} size="sm" type="submit">
      {pending ? "저장 중..." : "상태 저장"}
    </Button>
  );
}
