import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../../stores/historyStore';
import type { PracticeRecord, RealtimeStats } from '../../types';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '../../components/ui/chart';

interface RecentActivityChartProps {
    lessonId: string;
    currentStats?: RealtimeStats;
}

export function RecentActivityChart({ lessonId, currentStats }: RecentActivityChartProps) {
    const { t } = useTranslation();
    const getRecentPracticeLogs = useHistoryStore((state) => state.getRecentPracticeLogs);
    const [logs, setLogs] = useState<PracticeRecord[]>([]);

    const statsSig = currentStats ? `${currentStats.cpm}-${currentStats.duration}-${currentStats.accuracy}` : '';

    useEffect(() => {
        getRecentPracticeLogs(lessonId, 10).then((data) => {
            // Sort chronically (oldest first) for chart
            const sortedData = [...data].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

            // Inject currentStats if it's not present
            if (currentStats) {
                const now = Date.now();
                const isIncluded = sortedData.some(log =>
                    now - new Date(log.completedAt).getTime() < 60_000
                );

                if (!isIncluded) {
                    sortedData.push({
                        id: 'current',
                        lessonId,
                        lessonTitle: '',
                        duration: currentStats.duration,
                        cpm: currentStats.cpm,
                        wpm: currentStats.wpm,
                        accuracy: currentStats.accuracy,
                        totalCharacters: currentStats.totalCharacters,
                        correctChars: currentStats.correctChars,
                        incorrectChars: currentStats.incorrectChars,
                        completedAt: new Date().toISOString()
                    });
                }
            }

            setLogs(sortedData);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId, getRecentPracticeLogs, statsSig]);

    const chartData = useMemo(() => {
        if (logs.length < 3) return [];
        return logs.map((log) => {
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

    if (logs.length < 3) {
        return null;
    }

    const chartConfig = {
        cpm: {
            label: 'CPM',
            color: '#007FFF',
        }
    };

    return (
        <div className="rounded-lg mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 text-left">{t('recent_activity')}</h3>
            <div className="h-[250px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCpm" x1="0" y1="0" x2="0" y2="1">
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
                            fill="url(#colorCpm)"
                            dot={{ fill: "var(--background)", stroke: "#007FFF", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: "#007FFF", stroke: "var(--background)" }}
                        />
                    </AreaChart>
                </ChartContainer>
            </div>
        </div>
    );
}
