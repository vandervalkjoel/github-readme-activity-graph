export class Query {
    query: string;
    variables: {
        LOGIN: string;
    };
}

export class Colors {
    areaColor: string;
    bgColor: string;
    borderColor: string;
    color: string;
    titleColor: string;
    lineColor: string;
    pointColor: string;
    /** Optional so the theme table stays as upstream wrote it; falls back to the line color. */
    dailyColor?: string;
}

export class QueryOption {
    username: string;
    hide_title?: boolean;
    custom_title?: string;
    from?: string;
    to?: string;
    grid: boolean;
    colors: Colors;
    area: boolean;
    radius: number;
    height: number;
    days: number;
    /** Rolling-average window in days. 1 means no smoothing. */
    smooth: number;
    /** Draw the dot on each data point. */
    show_point: boolean;
    /** Label the x axis by month instead of by day. */
    month_labels: boolean;
    /** Draw the unsmoothed daily counts as bars behind the line. */
    daily: boolean;
}

export class ParsedQs {
    username?: string;
    hide_title?: boolean;
    custom_title?: string;
    bg_color?: string;
    border_color?: string;
    hide_border?: boolean;
    area_color?: string;
    color?: string;
    line?: string;
    point?: string;
    theme?: string;
    area?: boolean;
    radius?: number;
    title_color?: string;
    height?: number;
    days?: string;
    from?: string;
    to?: string;
    grid?: string;
    smooth?: string;
    hide_points?: string;
    x_axis?: string;
    months?: string;
    daily?: string;
    daily_color?: string;
}

export class GraphArgs {
    height: number;
    width: number;
    colors: Colors;
    title: string;
    radius: number;
    line: Promise<string>;
    /** Key for the two marks, drawn only when the daily bars are on. */
    legend?: string;
}

export class UserDetails {
    contributions: Array<ContributionDay>;
    name: string;
}

export class ContributionDay {
    contributionCount: number;
    date: string;
}

export class Week {
    contributionDays: Array<ContributionDay>;
}

export class ResponseOfApi {
    data?: {
        user: {
            name: string;
            contributionsCollection: {
                contributionCalendar: {
                    totalContributions: number;
                    weeks: Array<Week>;
                };
            };
        };
    };
    errors?: Array<{ message: string; type: string }>;
}
