import React, { useState, useMemo, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import type { NpsRow } from '@/lib/npsAnalysis';
import { normalizeStateName } from '@/lib/usStateMap';

const MAP_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

interface NpsStateMapProps {
  data: NpsRow[];
  minResponses?: number;
}

function getNpsColor(nps: number | null): string {
  if (nps === null || nps === undefined) return 'hsl(var(--muted))';
  if (nps >= 50) return 'hsl(142, 76%, 36%)';   // green
  if (nps >= 0) return 'hsl(142, 50%, 72%)';    // light green
  return 'hsl(0, 84%, 60%)';                     // red
}

export const NpsStateMap: React.FC<NpsStateMapProps> = ({
  data,
  minResponses = 1,
}) => {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    row: NpsRow | null;
  } | null>(null);

  const stateDataMap = useMemo(() => {
    const map = new Map<string, NpsRow>();
    for (const row of data ?? []) {
      if ((row?.responses ?? 0) < minResponses) continue;
      const canonical = normalizeStateName(row?.name ?? '') ?? row?.name;
      if (canonical) map.set(canonical, row);
    }
    return map;
  }, [data, minResponses]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  }, []);

  return (
    <div>
      <div className="relative w-full aspect-[1.6] max-h-[480px] bg-muted/30 rounded-lg overflow-hidden">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          className="w-full h-full"
        >
          <ZoomableGroup center={[-96, 38]} zoom={1} minZoom={0.7} maxZoom={4}>
            <Geographies geography={MAP_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties?.name ?? '';
                  const row = stateDataMap.get(name);
                  const nps = row?.nps ?? null;
                  const fill = getNpsColor(nps);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: row ? 'hsl(var(--accent))' : fill,
                          outline: 'none',
                          cursor: 'pointer',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={(e) => {
                        const rect = (e.target as SVGElement).getBoundingClientRect();
                        setTooltip({
                          name,
                          row,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        {tooltip && (
          <div
            className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md min-w-[180px]"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-medium mb-1">{tooltip.name}</div>
            {tooltip.row ? (
              <>
                <div className="text-muted-foreground mb-1.5">
                  NPS {tooltip.row.nps ?? '—'} · {tooltip.row.responses} responses
                </div>
                <div className="grid gap-0.5 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-green-600">Promoters (9–10)</span>
                    <span>{tooltip.row.promoters ?? 0}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Passives (7–8)</span>
                    <span>{tooltip.row.passives ?? 0}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-red-600">Detractors (0–6)</span>
                    <span>{tooltip.row.detractors ?? 0}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-border text-sm">
        <span className="text-muted-foreground">NPS scale:</span>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
          <span>50+</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: 'hsl(142, 50%, 72%)' }} />
          <span>0–49</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
          <span>&lt;0 </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm shrink-0 bg-muted" />
          <span>No data</span>
        </div>
      </div>
    </div>
  );
};
