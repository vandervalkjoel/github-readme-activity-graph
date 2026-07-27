import moment from 'moment';
import { createGraph } from './createChart';
import { graphSvg } from './svgs';
import { Colors, ContributionDay } from './interfaces/interface';

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

    async buildGraph(days: ContributionDay[]): Promise<string> {
        // Must be set before getOptions(), which closes over it for the labeller.
        this.hasMonthStart = days.some(
            (day) => moment(day.date, moment.ISO_8601).date() === 1,
        );

        //Options to pass in createGraph function
        const options = this.getOptions();

        //Construction of graph from node-chartist
        const line: Promise<string> = await createGraph('line', options, {
            labels: days.map((day) => day.date),
            series: [{ value: days.map((day) => day.contributionCount) }],
        });

        //Arguments to construct graphs with rect and other options
        const args = {
            height: this.height,
            width: this.width,
            colors: this.colors,
            title: this.title,
            radius: this.radius,
            line,
        };

        return graphSvg(args);
    }
}
