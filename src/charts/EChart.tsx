import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import type {
  BarSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  DataZoomComponentOption,
} from 'echarts/components';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>;

interface EChartProps {
  option: ChartOption;
  label: string;
}

export function EChart({ option, label }: EChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} className="chart" role="img" aria-label={label} />;
}
