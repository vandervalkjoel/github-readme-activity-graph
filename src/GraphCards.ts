import moment from 'moment';
import { createGraph } from './createChart';
import { graphSvg } from './svgs';
import { Colors, ContributionDay } from './interfaces/interface';

/**
 * Redraw the daily series' points as bars standing on the x axis.
 *
 * Chartist has no combined bar-and-line chart, but it draws every point as a
 * zero-length `<line>`, so stretching that line down to the axis turns the
 * series into bars without a second chart to keep in sync. Both series then
 * share one x and one y axis by construction.
 */
const dailyBarPlugin = (count: number) => (chart: any) => {
    chart.on('draw', (data: any) => {
        if (data.type !== 'point' || data.series.name !== 'daily') {
            return;
        }
        const rect = data.axisY.chartRect;
        // Leave a 2px gap between neighbours so the bars read as separate days,
        // and never go below a hairline on a year-long window.
        const spacing = rect.width() / Math.max(count - 1, 1);
        const barWidth = Math.max(1, Math.min(4, spacing - 2));
        data.element
            .removeClass('ct-point')
            .addClass('ct-daily')
            .attr({ x2: data.x, y2: rect.y1, style: `stroke-width: ${barWidth}px` });
    });
};

export class Card {
    constructor(
        private readonly height: number,
        private readonly width: number,
        private readonly radius: number,
        private readonly colors: Colors,
        private readonly title = '',
        private readonly area = false,
        private readonly showGrid = true,
        private readonly showPoint = true,
        private readonly monthLabels = false,
        private readonly smooth = 1,
    ) {}

    /** Whether the plotted range contains the first of any month. */
    private hasMonthStart = false;

    /**
     * Turn an ISO date into an axis label.
     *
     * Default reproduces upstream: the day of the month on every point. In month
     * mode only the first of each month is labelled, and everything else returns
     * null so chartist draws no text.
     *
     * The leading partial month is left unlabelled on purpose. Labelling index 0
     * as well collides with the next month's label whenever the range starts near
     * a month end: a 90 day window beginning 28 April rendered as "AprMay". The
     * first point is labelled only when the range contains no month start at all,
     * so short windows are not left with a bare axis.
     */
    private labelFor(value: string, index: number): string | null {
        const m = moment(value, moment.ISO_8601);
        if (!m.isValid()) {
            return value;
        }
        if (!this.monthLabels) {
            return m.date().toString();
        }
        if (m.date() === 1) {
            return m.format('MMM');
        }
        return index === 0 && !this.hasMonthStart ? m.format('MMM') : null;
    }

    private getOptions() {
        return {
            width: this.width,
            height: this.height,
            axisY: {
                title: 'Contributions',
                onlyInteger: true,
                offset: 70,
                labelOffset: {
                    y: 4.5,
                },
                low: 0,
                showGrid: this.showGrid,
            },
            axisX: {
                // The month names speak for themselves, so the axis title only
                // earns its space in day mode.
                title: this.monthLabels ? '' : 'Days',
                offset: 50,
                labelOffset: {
                    x: -4.5,
                },
                showGrid: this.showGrid,
                labelInterpolationFnc: (value: string, index: number) =>
                    this.labelFor(value, index),
            },
            chartPadding: {
                top: 80,
                right: 50,
                bottom: 20,
                left: 20,
            },
            showArea: this.area,
            showPoint: this.showPoint,
            fullWidth: true,
        };
    }

    /** Unused Code ref #85 */
    // private getContrubutionDates() {
    //     const days = [];
    //     for (const date = new Date(); days.length < 31; date.setDate(date.getUTCDate() - 1)) {
    //         const current = new Date(date);
    //         days.push(
    //             current.toLocaleString('default', { month: 'short' }) +
    //                 ' ' +
    //                 current.getUTCDate().toString()
    //         );
    //     }

    //     return days.reverse();
    // }

    /**
     * A key for the two marks, centred under the title.
     *
     * Two marks drawn from one dataset need saying out loud, otherwise the line
     * reads as a series the bars disagree with. Plain `<text>` and shapes rather
     * than a foreignObject, so it survives being embedded as an `<img>`.
     */
    private buildLegend(): string {
        const y = 62;
        const label = `${this.smooth}-day average`;
        // Segoe UI at 13px semibold averages a hair over 7px per character, which
        // is close enough to centre the row by eye.
        const charWidth = 7.2;
        const barsWidth = 14;
        const lineWidth = 22;
        const gap = 8;
        const spacer = 24;
        const total =
            barsWidth +
            gap +
            'daily'.length * charWidth +
            spacer +
            lineWidth +
            gap +
            label.length * charWidth;
        let x = Math.round((this.width - total) / 2);

        const bars = [6, 13, 9]
            .map((h, i) => {
                const bx = x + i * 5 + 1;
                return `<line class="ct-legend-bar" x1="${bx}" y1="${y + 4}" x2="${bx}" y2="${
                    y + 4 - h
                }" style="stroke-width: 2px" />`;
            })
            .join('');
        x += barsWidth + gap;
        const dailyText = `<text class="ct-legend-label" x="${x}" y="${y + 4}">daily</text>`;
        x += 'daily'.length * charWidth + spacer;
        const swatch = `<line class="ct-legend-line" x1="${x}" y1="${y}" x2="${
            x + lineWidth
        }" y2="${y}" />`;
        x += lineWidth + gap;
        const avgText = `<text class="ct-legend-label" x="${x}" y="${y + 4}">${label}</text>`;

        return `<g data-testid="legend">${bars}${dailyText}${swatch}${avgText}</g>`;
    }

    /**
     * @param days the series the line is drawn from, already smoothed
     * @param raw the unsmoothed daily counts, drawn as bars when present
     */
    async buildGraph(days: ContributionDay[], raw?: ContributionDay[]): Promise<string> {
        // Must be set before getOptions(), which closes over it for the labeller.
        this.hasMonthStart = days.some((day) => moment(day.date, moment.ISO_8601).date() === 1);

        //Options to pass in createGraph function
        const options: any = this.getOptions();

        const showDaily = raw !== undefined && raw.length === days.length;
        // Upstream's single-series shape is kept verbatim for the default path,
        // so nothing changes for callers that never ask for the bars.
        let data: any = {
            labels: days.map((day) => day.date),
            series: [{ value: days.map((day) => day.contributionCount) }],
        };

        if (showDaily) {
            options.series = {
                daily: { showLine: false, showPoint: true, showArea: false, lineSmooth: false },
                trend: { showLine: true, showPoint: this.showPoint, showArea: this.area },
            };
            options.plugins = [dailyBarPlugin(raw!.length)];
            data = {
                labels: days.map((day) => day.date),
                series: [
                    // Drawn first so the trend line sits on top of the bars.
                    {
                        name: 'daily',
                        className: 'ct-daily-series',
                        data: raw!.map((day) => day.contributionCount),
                    },
                    {
                        name: 'trend',
                        className: 'ct-trend-series',
                        data: days.map((day) => day.contributionCount),
                    },
                ],
            };
        }

        //Construction of graph from node-chartist
        const line: Promise<string> = await createGraph('line', options, data);

        //Arguments to construct graphs with rect and other options
        const args = {
            height: this.height,
            width: this.width,
            colors: this.colors,
            title: this.title,
            radius: this.radius,
            line,
            legend: showDaily ? this.buildLegend() : '',
        };

        return graphSvg(args);
    }
}
