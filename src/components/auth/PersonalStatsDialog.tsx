import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useHistoryStore } from '../../stores/historyStore';
import { useLessonStore } from '../../stores/lessonStore';
import { getScoreLevel } from '../../utils/statsCalculator';
import { ChartContainer } from '../ui/chart';
import type { PracticeRecord } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PersonalStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonalStatsDialog({ open, onOpenChange }: PersonalStatsDialogProps) {
  const { t } = useTranslation();
  const getAllRecentPracticeLogs = useHistoryStore((state) => state.getAllRecentPracticeLogs);
  const lessons = useLessonStore((state) => state.lessons);
  const [logs, setLogs] = useState<PracticeRecord[] | null>(null);

  const lessonTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const lesson of lessons) {
      map.set(lesson.id, lesson.title);
    }
    return map;
  }, [lessons]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAllRecentPracticeLogs(20).then((data) => {
      if (!cancelled) setLogs(data);
    });
    return () => { cancelled = true; };
  }, [open, getAllRecentPracticeLogs]);

  const recentThree = logs?.slice(0, 3) ?? [];

  const chartData = useMemo(() => {
    if (!logs || logs.length < 3) return [];
    const chronological = [...logs].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    return chronological.map((log) => {
      const date = new Date(log.completedAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
      return {
        name: isToday ? timeStr : dateStr,
        cpm: log.cpm,
        wpm: log.wpm,
        accuracy: log.accuracy,
        duration: log.duration,
      };
    });
  }, [logs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const isToday = date.toDateString() === new Date().toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
  };

  const chartConfig = {
    cpm: {
      label: 'CPM',
      color: '#007FFF',
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl rounded-2xl border-gray-100 bg-white p-5 shadow-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-800">{t('auth.stats_title')}</DialogTitle>
        </DialogHeader>

        {logs === null ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-400">{t('loading')}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-400">{t('auth.no_records')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recent Results */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('auth.recent_results')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-400">
                      <th className="pb-2 font-medium">{t('auth.lesson_name')}</th>
                      <th className="pb-2 font-medium text-center">{t('stats.char_speed')}</th>
                      <th className="pb-2 font-medium text-center">{t('stats.wpm_title')}</th>
                      <th className="pb-2 font-medium text-center">{t('stats.accuracy')}</th>
                      <th className="pb-2 font-medium text-center">{t('stats.grade')}</th>
                      <th className="pb-2 font-medium text-right">{t('time')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentThree.map((log) => {
                      const score = getScoreLevel(log.accuracy, log.cpm);
                      return (
                        <tr key={log.id} className="border-b border-gray-50">
                          <td className="py-2.5 max-w-[160px] truncate text-gray-700">
                            {lessonTitleMap.get(log.lessonId) || log.lessonId}
                          </td>
                          <td className="py-2.5 text-center text-primary font-medium">{log.cpm}</td>
                          <td className="py-2.5 text-center text-green-600">{log.wpm}</td>
                          <td className="py-2.5 text-center text-purple-600">{log.accuracy}%</td>
                          <td className={`py-2.5 text-center font-bold ${score.color}`}>{score.level}</td>
                          <td className="py-2.5 text-right text-gray-400 text-xs">{formatDate(log.completedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress Chart */}
            {chartData.length >= 3 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('auth.progress_chart')}</h3>
                <div className="h-[220px] w-full">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCpmStats" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007FFF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#007FFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        minTickGap={15}
                      />
                      <YAxis
                        dataKey="cpm"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border/50 p-3 rounded-lg shadow-xl text-sm min-w-[10rem]">
                                <p className="font-bold mb-3 text-foreground border-b border-border/50 pb-2">{label}</p>
                                <div className="grid gap-2">
                                  <div className="flex justify-between gap-6">
                                    <span className="text-muted-foreground">{t('stats.char_speed')}</span>
                                    <span className="font-medium text-primary">{data.cpm} {t('stats.char_unit')}</span>
                                  </div>
                                  <div className="flex justify-between gap-6">
                                    <span className="text-muted-foreground">{t('stats.wpm_title')}</span>
                                    <span className="font-medium text-green-600">{data.wpm} {t('stats.wpm_unit')}</span>
                                  </div>
                                  <div className="flex justify-between gap-6">
                                    <span className="text-muted-foreground">{t('stats.accuracy')}</span>
                                    <span className="font-medium text-purple-600">{data.accuracy}%</span>
                                  </div>
                                  <div className="flex justify-between gap-6">
                                    <span className="text-muted-foreground">{t('time')}</span>
                                    <span className="font-medium text-foreground">{Math.floor(data.duration / 60)}:{(data.duration % 60).toString().padStart(2, '0')}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cpm"
                        stroke="#007FFF"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCpmStats)"
                        dot={{ fill: "var(--background)", stroke: "#007FFF", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#007FFF", stroke: "var(--background)" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
