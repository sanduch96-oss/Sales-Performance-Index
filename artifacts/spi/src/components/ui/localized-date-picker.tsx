import * as React from "react";
import type { Locale } from "date-fns";
import { ro } from "date-fns/locale/ro";
import { ru } from "date-fns/locale/ru";
import { enUS } from "date-fns/locale/en-US";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useLanguage, type Language } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

const LOCALE_MAP: Record<Language, { dateFns: Locale; intl: string; placeholder: string }> = {
  ro: { dateFns: ro, intl: "ro-RO", placeholder: "Selectează data" },
  ru: { dateFns: ru, intl: "ru-RU", placeholder: "Выберите дату" },
  en: { dateFns: enUS, intl: "en-US", placeholder: "Select date" },
};

function parseYMD(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface LocalizedDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function LocalizedDatePicker({ value, onChange, className, placeholder }: LocalizedDatePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const loc = LOCALE_MAP[language];

  const selected = parseYMD(value);
  const label = selected
    ? new Intl.DateTimeFormat(loc.intl, { day: "numeric", month: "long", year: "numeric" }).format(selected)
    : (placeholder ?? loc.placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start gap-2 font-normal text-left",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={d => {
            onChange(d ? toYMD(d) : "");
            setOpen(false);
          }}
          locale={loc.dateFns}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2030, 11)}
          defaultMonth={selected ?? new Date()}
          initialFocus
          formatters={{
            formatMonthDropdown: (date) =>
              date.toLocaleString(loc.intl, { month: "long" }),
          }}
          classNames={{
            dropdown_root: [
              "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px]",
              "relative rounded-md border",
              "min-w-[7rem]",
            ].join(" "),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
