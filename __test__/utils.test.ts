import express from 'express';
import request from 'supertest';
import { Utilities } from '../src/utils';
import { fakeQueryString, fakeQueryStringRes, options } from './fakeInputs';
import { Handlers } from '../src/handlers';
import { createGraph } from '../src/createChart';
import { Card } from '../src/GraphCards';

describe('Utilities Test', () => {
    const handlers = new Handlers();
    it('Query Options', () => {
        expect(
            fakeQueryString.map((arg) => {
                const utils = new Utilities(arg);
                return utils.queryOptions();
            }),
        ).toEqual(fakeQueryStringRes);
    });

    // Testing express routes
    const fakeServer = () => {
        const app = express();
        app.use(express.urlencoded({ extended: false }));
        return app;
    };

    describe('GET /graph with correct credential', () => {
        test('responding', (done) => {
            const app = fakeServer();
            app.get('/graph', handlers.getGraph);
            request(app)
                .get('/graph?username=ashutosh00710')
                .expect('Content-Type', 'image/svg+xml; charset=utf-8')
                .expect('Cache-Control', 'public, max-age=1800')
                .expect(200, done);
        });
    });

    describe('GET /graph with incorrect credential', () => {
        test('responding', (done) => {
            const app = fakeServer();
            app.get('/graph', handlers.getGraph);
            request(app)
                .get('/graph?username=')
                .expect('Content-Type', 'image/svg+xml; charset=utf-8')
                .expect('Cache-Control', 'no-store, max-age=0')
                .expect(200, done);
        });
    });

    //- Chart Function ([Promise] Inside Graph Cards Class) ✔
    it('Graph Generation', async () => {
        expect.assertions(1);

        const days = [
            {
                contributionCount: 2,
                date: '1',
            },
            {
                contributionCount: 3,
                date: '2',
            },
            {
                contributionCount: 10,
                date: '3',
            },
            {
                contributionCount: 12,
                date: '4',
            },
            {
                contributionCount: 14,
                date: '5',
            },
        ];
        const graph: Promise<string> = await createGraph('line', options, {
            labels: days.map((day) => day.date),
            series: [{ value: days.map((day) => day.contributionCount) }],
        });
        expect(graph).toMatchSnapshot();
    });

    describe('Daily bars', () => {
        const days = [
            { contributionCount: 4, date: '2024-01-01' },
            { contributionCount: 0, date: '2024-01-02' },
            { contributionCount: 9, date: '2024-01-03' },
            { contributionCount: 2, date: '2024-01-04' },
        ];
        const colors = {
            areaColor: '9e4c98',
            bgColor: '44475a',
            borderColor: '0000',
            color: 'f8f8f2',
            titleColor: 'f8f8f2',
            lineColor: 'ff79c6',
            pointColor: 'bd93f9',
            dailyColor: 'ff79c6',
        };
        const card = () => new Card(420, 1200, 0, colors, '', false, true, false, false, 2);

        const attr = (element: string, name: string) =>
            Number(new RegExp(`${name}="([\\d.]+)"`).exec(element)?.[1]);

        it('draws one bar per day, all standing on the same baseline', async () => {
            const svg = await card().buildGraph(days, days);
            const bars = [...svg.matchAll(/<line[^>]*class="ct-daily"[^>]*>/g)].map((m) => m[0]);
            expect(bars).toHaveLength(days.length);

            const baselines = bars.map((bar) => attr(bar, 'y2'));
            expect(new Set(baselines).size).toBe(1);
            expect(baselines[0]).toBeGreaterThan(0);
            // Vertical: a bar sits over the day it belongs to.
            bars.forEach((bar) => expect(attr(bar, 'x1')).toBe(attr(bar, 'x2')));

            // A bar is as tall as its count, so the zero day has no height and
            // the biggest count is the tallest bar.
            const heights = bars.map((bar, i) => baselines[i] - attr(bar, 'y1'));
            expect(heights[1]).toBe(0);
            expect(Math.max(...heights)).toBe(heights[2]);
        });

        it('keys the two marks and leaves the single-series card alone', async () => {
            const withBars = await card().buildGraph(days, days);
            expect(withBars).toContain('data-testid="legend"');
            expect(withBars).toContain('2-day average');

            const withoutBars = await card().buildGraph(days);
            expect(withoutBars).not.toContain('class="ct-daily"');
            expect(withoutBars).not.toContain('data-testid="legend"');
        });
    });

    it('reads the daily options off the query string', () => {
        const utils = new Utilities({
            username: 'githubusername',
            daily: 'true',
            daily_color: '58a6ff',
            smooth: '7',
        });
        const options = utils.queryOptions();
        expect(options.daily).toBe(true);
        expect(options.colors.dailyColor).toBe('58a6ff');
    });
});
