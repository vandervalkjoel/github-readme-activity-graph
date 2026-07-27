/**
 * The whole block is inlined into every card, so it stays free of comments.
 *
 * `.ct-daily` is the one rule that needs explaining: those are the per-day bars.
 * Butt caps keep a bar's height equal to its count instead of overshooting by
 * half a stroke, which also means a zero day draws nothing at all. Their width
 * is set inline per bar, because it depends on how many days are in the window.
 */
export const graphStyle = (
    color: string,
    line: string,
    point: string,
    area: string,
    daily: string = line,
) =>
    `
    .ct-label {
      fill: #${color};
      color: #${color};
      font-size: .75rem;
      line-height: 1;
    }

    .ct-grid-background,
    .ct-line {
      fill: none;
    }

    .ct-chart-bar .ct-label,
    .ct-chart-line .ct-label {
      display: block;
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      display: flex;
    }

    .ct-label.ct-horizontal.ct-start {
      -webkit-box-align: flex-end;
      -webkit-align-items: flex-end;
      -ms-flex-align: flex-end;
      align-items: flex-end;
      -webkit-box-pack: flex-start;
      -webkit-justify-content: flex-start;
      -ms-flex-pack: flex-start;
      justify-content: flex-start;
      text-align: left;
      text-anchor: start;
    }

    .ct-label.ct-horizontal.ct-end {
      -webkit-box-align: flex-start;
      -webkit-align-items: flex-start;
      -ms-flex-align: flex-start;
      align-items: flex-start;
      -webkit-box-pack: flex-start;
      -webkit-justify-content: flex-start;
      -ms-flex-pack: flex-start;
      justify-content: flex-start;
      text-align: left;
      text-anchor: start;
    }

    .ct-label.ct-vertical.ct-start {
      -webkit-box-align: flex-end;
      -webkit-align-items: flex-end;
      -ms-flex-align: flex-end;
      align-items: flex-end;
      -webkit-box-pack: flex-end;
      -webkit-justify-content: flex-end;
      -ms-flex-pack: flex-end;
      justify-content: flex-end;
      text-align: right;
      text-anchor: end;
    }

    .ct-label.ct-vertical.ct-end {
      -webkit-box-align: flex-end;
      -webkit-align-items: flex-end;
      -ms-flex-align: flex-end;
      align-items: flex-end;
      -webkit-box-pack: flex-start;
      -webkit-justify-content: flex-start;
      -ms-flex-pack: flex-start;
      justify-content: flex-start;
      text-align: left;
      text-anchor: start;
    }

    .ct-grid {
      stroke: #${color};
      stroke-width: 1px;
      stroke-opacity: 0.3;
      stroke-dasharray: 2px;
    }

    .ct-point {
      stroke-width: 10px;
      stroke-linecap: round;
      stroke: #${point};
      animation: blink 1s ease-in-out forwards;
    }

    .ct-line {
      stroke-width: 4px;
      stroke-dasharray: 5000;
      stroke-dashoffset: 5000;
      stroke: #${line};
      animation: dash 5s ease-in-out forwards;
    }

    .ct-area {
      stroke: none;
      fill-opacity: 0.1;
    }

    .ct-series-a .ct-area,
    .ct-trend-series .ct-area,
    .ct-series-a .ct-slice-pie {
      fill: #${area};
    }

    .ct-daily,
    .ct-legend-bar {
      stroke: #${daily};
      stroke-opacity: 0.6;
      stroke-linecap: butt;
      fill: none;
      animation: blink 1s ease-in-out forwards;
    }

    .ct-legend-line {
      stroke: #${line};
      stroke-width: 4px;
      stroke-linecap: round;
    }

    .ct-legend-label {
      fill: #${color};
      font: 600 13px 'Segoe UI', Ubuntu, Sans-Serif;
      opacity: 0.85;
    }

    .ct-label .ct-horizontal {
      transform: rotate(-90deg)
    }
    `;

/** Unused style for dates feature #85 */
export const diagonalTiltStyle = () => {
    return `
    .ct-label.ct-horizontal.ct-end {
      transform: rotate(-30deg);
      -webkit-transform: rotate(-30deg);
      -moz-transform: rotate(-30deg);
      -o-transform: rotate(-30deg);
      -ms-transform: rotate(-30deg);
      transform-box: fill-box;
      transform-origin: 100% 0;
      text-anchor: end;
    }
  `;
};
