"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { WEEKDAYS, type ForecastInput, type WeekdayId } from "./rules";
import { NEIGHBORHOODS } from "./weather";

import { cn } from "@/lib/utils";

/** Rounded white inputs on the paper surface. */
const FIELD = "h-10.5 rounded-[14px] border-[1.5px] border-hot-line bg-white";

const neighborhoodItems = NEIGHBORHOODS.map((n) => ({ value: n.id, label: n.label }));

type Props = {
  initialInput: ForecastInput;
  pending: boolean;
  onSubmit: (input: ForecastInput) => void;
};

export function ForecastForm({ initialInput, pending, onSubmit }: Props) {
  const [input, setInput] = useState(initialInput);
  const [showErrors, setShowErrors] = useState(false);
  const update = (patch: Partial<ForecastInput>) => setInput((prev) => ({ ...prev, ...patch }));

  const missingBirthday = input.birthday === "";
  const missingNeighborhood = input.neighborhood === "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (missingBirthday || missingNeighborhood) {
      setShowErrors(true);
      return;
    }
    onSubmit(input);
  }

  function toggleMeeting(day: WeekdayId, checked: boolean) {
    update({
      meetingDays: checked
        ? WEEKDAYS.map((d) => d.id).filter((id) => id === day || input.meetingDays.includes(id))
        : input.meetingDays.filter((id) => id !== day),
    });
  }

  return (
    <form
      id="forecast-form"
      aria-label="명식 세우기"
      onSubmit={handleSubmit}
      noValidate
      className="paper break-keep rounded-[28px] border-2 border-dashed border-paper-line px-4 py-5 font-cute sm:p-8 **:data-[slot=field-label]:normal-case **:data-[slot=field-legend]:normal-case"
    >
      <FieldGroup className="gap-5">
        <div className="text-center">
          <p aria-hidden className="font-hanja text-[13px] font-extrabold tracking-[0.4em] text-hot">
            職 場 命 式
          </p>
          <h2 className="text-xl">명식 세우기 전에 알려 주세요 🧧</h2>
          <p className="text-[13px] text-ink-soft">
            {initialInput.birthday === ""
              ? "생일과 동네만 있으면 돼요. 나머지는 알려 줄 때만 채워요."
              : "지난번에 넣은 값이 채워져 있어요. 바꿀 것만 바꾸고 눌러요."}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={showErrors && missingBirthday}>
            <FieldLabel htmlFor="birthday">생일</FieldLabel>
            <Input
              id="birthday"
              className={FIELD}
              type="date"
              value={input.birthday}
              max="2020-12-31"
              aria-invalid={showErrors && missingBirthday}
              onChange={(e) => update({ birthday: e.target.value })}
            />
            {showErrors && missingBirthday && <FieldError>생일을 알려 주세요.</FieldError>}
          </Field>

          <Field data-invalid={showErrors && missingNeighborhood}>
            <FieldLabel htmlFor="neighborhood">동네</FieldLabel>
            <Select
              items={neighborhoodItems}
              value={input.neighborhood === "" ? null : input.neighborhood}
              onValueChange={(value) => update({ neighborhood: value ?? "" })}
            >
              <SelectTrigger id="neighborhood" className={cn(FIELD, "w-full")} aria-invalid={showErrors && missingNeighborhood}>
                <SelectValue placeholder="동네를 고르세요" />
              </SelectTrigger>
              <SelectContent>
                {neighborhoodItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showErrors && missingNeighborhood && <FieldError>동네를 골라 주세요.</FieldError>}
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">요일별 루틴</FieldLegend>
          <FieldDescription>회의가 있는 요일을 체크하세요.</FieldDescription>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <Field
                key={day.id}
                orientation="horizontal"
                className="w-auto gap-1 rounded-full border-[1.5px] border-hot-line bg-white px-3 py-1.5"
              >
                <Checkbox
                  id={`meeting-${day.id}`}
                  checked={input.meetingDays.includes(day.id)}
                  onCheckedChange={(checked) => toggleMeeting(day.id, checked)}
                  className="rounded-md border-hot-line data-checked:border-hot data-checked:bg-hot data-checked:text-white"
                />
                <FieldLabel htmlFor={`meeting-${day.id}`} className="font-normal">
                  {day.label} 회의 있음
                </FieldLabel>
              </Field>
            ))}
          </div>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="claude-usage">어제 Claude 사용량: {input.claudeUsage}</FieldLabel>
          <Slider
            id="claude-usage"
            aria-label="어제 Claude 사용량"
            min={0}
            max={10}
            step={1}
            value={[input.claudeUsage]}
            onValueChange={(value) => update({ claudeUsage: Array.isArray(value) ? value[0] : value })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>안 씀</span>
            <span>하루 종일</span>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="important-task">오늘의 중요한 일 (선택)</FieldLabel>
          <Input
            id="important-task"
            className={FIELD}
            value={input.importantTask}
            maxLength={100}
            placeholder="예: 오후 3시 팀장님께 휴가 결재 받기"
            onChange={(e) => update({ importantTask: e.target.value })}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 w-full rounded-full bg-ink text-[15px] font-extrabold tracking-normal normal-case text-white hover:bg-ink/90"
        >
          {pending ? "예보 준비 중…" : "예보 보기"}
        </Button>
      </FieldGroup>
    </form>
  );
}
