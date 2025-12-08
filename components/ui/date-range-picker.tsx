"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { ja } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateRangePickerProps extends React.ComponentProps<"div"> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({ className, date, onDateChange }: DateRangePickerProps) {
  // 手入力用のローカルステート
  const [fromString, setFromString] = React.useState<string>(date?.from ? format(date.from, 'yyyy/MM/dd') : "");
  const [toString, setToString] = React.useState<string>(date?.to ? format(date.to, 'yyyy/MM/dd') : "");

  // date propが外部から変更された場合に、手入力フィールドも更新する
  React.useEffect(() => {
    if (date?.from) {
      setFromString(format(date.from, 'yyyy/MM/dd'));
    } else {
      setFromString("");
    }
    if (date?.to) {
      setToString(format(date.to, 'yyyy/MM/dd'));
    } else {
      setToString("");
    }
  }, [date]);

  // 手入力フィールドからフォーカスが外れた時の処理
  const handleFromChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedDate = parse(value, 'yyyy/MM/dd', new Date());
    if (isValid(parsedDate)) {
      onDateChange({ from: parsedDate, to: date?.to });
    }
  };
  
  const handleToChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedDate = parse(value, 'yyyy/MM/dd', new Date());
    if (isValid(parsedDate)) {
      onDateChange({ from: date?.from, to: parsedDate });
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal text-lg py-6",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy/MM/dd")} -{" "}
                  {format(date.to, "yyyy/MM/dd")}
                </>
              ) : (
                format(date.from, "yyyy/MM/dd")
              )
            ) : (
              <span>日付の範囲を選択...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="p-4 border-b sm:border-b-0 sm:border-r">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="from-date">開始日</Label>
                        <Input 
                            id="from-date"
                            value={fromString} 
                            onChange={(e) => setFromString(e.target.value)}
                            onBlur={handleFromChange}
                            placeholder="YYYY/MM/DD"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="to-date">終了日</Label>
                        <Input 
                            id="to-date"
                            value={toString}
                            onChange={(e) => setToString(e.target.value)}
                            onBlur={handleToChange}
                            placeholder="YYYY/MM/DD"
                        />
                    </div>
                </div>
            </div>
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
                locale={ja}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}