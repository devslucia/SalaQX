"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import type { DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaultClassNames,
        root: cn("rdp-root", defaultClassNames.root),
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-semibold text-[#1C2833] dark:text-[#E6EDF3]",
        nav: "absolute right-1 top-1 flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent border-transparent p-0 opacity-70 hover:opacity-100 hover:bg-[#1B4F72]/10 dark:hover:bg-[#2E86C1]/20",
          "aria-label:Go to previous month"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent border-transparent p-0 opacity-70 hover:opacity-100 hover:bg-[#1B4F72]/10 dark:hover:bg-[#2E86C1]/20",
          "aria-label:Go to next month"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
        week: "flex w-full mt-1",
        day: cn(
          "h-9 w-9 p-0 font-normal text-sm flex-1 text-center relative",
          "aria-selected:opacity-100"
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md transition-colors",
          "hover:bg-[#1B4F72]/10 dark:hover:bg-[#2E86C1]/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72] dark:focus-visible:ring-[#2E86C1]"
        ),
        selected: cn(
          "bg-[#1B4F72] dark:bg-[#2E86C1] text-white hover:bg-[#154360] dark:hover:bg-[#1B4F72] hover:text-white focus:bg-[#1B4F72] focus:text-white"
        ),
        today: cn(
          "ring-1 ring-[#1B4F72] dark:ring-[#2E86C1] font-semibold"
        ),
        outside: "text-muted-foreground/40 opacity-60",
        disabled: cn(
          "opacity-30 text-[#8B949E] dark:text-[#8B949E] cursor-not-allowed line-through",
          "hover:bg-transparent dark:hover:bg-transparent"
        ),
        hidden: "invisible",
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: "rounded-none",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
