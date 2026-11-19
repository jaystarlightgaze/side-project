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
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={showErrors && missingBirthday}>
            <FieldLabel htmlFor="birthday">생일</FieldLabel>
            <Input
              id="birthday"
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
              <SelectTrigger id="neighborhood" className="w-full" aria-invalid={showErrors && missingNeighborhood}>
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
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {WEEKDAYS.map((day) => (
              <Field key={day.id} orientation="horizontal" className="w-auto">
                <Checkbox
                  id={`meeting-${day.id}`}
                  checked={input.meetingDays.includes(day.id)}
                  onCheckedChange={(checked) => toggleMeeting(day.id, checked)}
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
            value={input.importantTask}
            maxLength={100}
            placeholder="예: 오후 3시 팀장님께 휴가 결재 받기"
            onChange={(e) => update({ importantTask: e.target.value })}
          />
        </Field>

        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
          {pending ? "예보 준비 중…" : "예보 보기"}
        </Button>
      </FieldGroup>
    </form>
  );
}
