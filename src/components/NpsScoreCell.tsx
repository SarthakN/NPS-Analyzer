import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NpsScoreCellProps {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  className?: string;
}

export const NpsScoreCell: React.FC<NpsScoreCellProps> = ({
  score,
  promoters = 0,
  passives = 0,
  detractors = 0,
  className = '',
}) => {
  const isNegative = score < 0;
  const p = Number(promoters) || 0;
  const pa = Number(passives) || 0;
  const d = Number(detractors) || 0;
  const total = p + pa + d;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded px-1 -mx-1 ${className} ${
            isNegative ? 'text-red-600 font-medium' : ''
          }`}
        >
          {score}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Score breakdown</h4>
          <div className="grid gap-1.5 text-sm">
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-green-600">Promoters (9–10)</span>
              <span className="font-medium">{p}</span>
            </div>
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-muted-foreground">Passives (7–8)</span>
              <span className="font-medium">{pa}</span>
            </div>
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-red-600">Detractors (0–6)</span>
              <span className="font-medium">{d}</span>
            </div>
            <div className="flex justify-between items-baseline gap-4 pt-1.5 border-t border-border">
              <span>Total responses</span>
              <span className="font-medium">{total}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
