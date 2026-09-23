import axios, { AxiosResponse } from 'axios';
import * as dotenv from 'dotenv';
import moment from 'moment';
import { Query, UserDetails, Week, ContributionDay, ResponseOfApi } from 'src/interfaces/interface';

dotenv.config();

// GitHub's GraphQL API fails transiently now and then (a timeout, a 502, a
// secondary rate limit). Upstream made one attempt and reported any failure as
// a bad username, so a single blip put a misleading error on the profile.
// Retrying a couple of times with a short backoff rides those out, and the
// delays stay small so a request still finishes well inside the function limit.
const RETRY_DELAYS_MS = [250, 750];

// A GraphQL error of these types will not change on retry.
const PERMANENT_ERROR_TYPES = ['NOT_FOUND', 'RATE_LIMITED'];

export const UNKNOWN_USER_MESSAGE = `Can't fetch any contribution. Please check your username 😬`;
export const API_UNAVAILABLE_MESSAGE = `GitHub's API did not respond. Try again shortly 🔁`;

export class Fetcher {
    private readonly username: string;
    // Overridable so tests do not sit through real backoff delays.
    public retryDelaysMs: number[] = RETRY_DELAYS_MS;
    constructor(username: string) {
        this.username = username;
    }

    private getGraphQLQuery(from: string, to: string) {
        return {
            query: `
              query userInfo($LOGIN: String!, $FROM: DateTime!, $TO: DateTime!) {
                user(login: $LOGIN) {
                  name
                  contributionsCollection(from: $FROM, to: $TO) {
                    contributionCalendar {
                      weeks {
                        contributionDays {
                          contributionCount
                          date
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
                LOGIN: this.username,
                FROM: from,
                TO: to,
            },
        };
    }

    private async fetch(graphQLQuery: Query): Promise<AxiosResponse<ResponseOfApi>> {
        return axios({
            url: 'https://api.github.com/graphql',
            method: 'POST',
            headers: {
                Authorization: `bearer ${process.env.TOKEN}`,
            },
            data: graphQLQuery,
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Resolves with the last response once it is usable or permanently failed,
    // and rethrows the last exception if every attempt threw.
    private async fetchWithRetry(graphQLQuery: Query): Promise<AxiosResponse<ResponseOfApi>> {
        let lastError: unknown;
        let lastResponse: AxiosResponse<ResponseOfApi> | undefined;
        for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt++) {
            if (attempt > 0) await this.sleep(this.retryDelaysMs[attempt - 1]);
            try {
                lastResponse = await this.fetch(graphQLQuery);
                const errors = lastResponse.data.errors;
                if (!errors || PERMANENT_ERROR_TYPES.includes(errors[0]?.type)) {
                    return lastResponse;
                }
                lastError = undefined;
            } catch (error) {
                lastError = error;
                lastResponse = undefined;
            }
        }
        if (lastResponse) return lastResponse;
        throw lastError;
    }

    public async fetchContributions(
        days: number,
        customFromDate?: string,
        customToDate?: string,
    ): Promise<UserDetails | string> {
        let from = '',
            to = '';
        if (customFromDate && customToDate) {
            from = moment(customFromDate).utc().toISOString(true);
            to = moment(customToDate).utc().toISOString(true);
        } else {
            const now = moment();
            from = moment(now).subtract(days, 'days').utc().toISOString();
            // also include the next day in case our server is behind in time with respect to GitHub
            to = moment(now).add(1, 'days').utc().toISOString();
        }

        try {
            const apiResponse = await this.fetchWithRetry(this.getGraphQLQuery(from, to));

            if (apiResponse.data.errors) {
                console.error('API Error: ', apiResponse.data.errors);
                if (apiResponse.data.errors[0].type === 'RATE_LIMITED') {
                    console.log('GraphQL Error: API rate limit exceeded');
                    return '💥 API rate limit exceeded. Please deploy your own instance.';
                } else if (apiResponse.data.errors[0].type === 'NOT_FOUND') {
                    return UNKNOWN_USER_MESSAGE;
                } else {
                    return API_UNAVAILABLE_MESSAGE;
                }
            } else if (apiResponse.data.data) {
                if (apiResponse.data.data.user === null) return UNKNOWN_USER_MESSAGE;
                else {
                    const userData: UserDetails = {
                        contributions: [],
                        name: apiResponse.data.data.user.name,
                    };
                    //filtering the week data from API response
                    const weeks =
                        apiResponse.data.data.user.contributionsCollection.contributionCalendar
                            .weeks;
                    // get day-contribution data
                    // Keep the full ISO date. Upstream truncated it to the day of
                    // the month here, which made month-level axis labels
                    // impossible. The day-number label is now produced at render
                    // time instead, so the default output is unchanged.
                    weeks.map((week: Week) =>
                        week.contributionDays.map((contributionDay: ContributionDay) => {
                            contributionDay.date = moment(
                                contributionDay.date,
                                moment.ISO_8601,
                            ).format('YYYY-MM-DD');
                            userData.contributions.push(contributionDay);
                        }),
                    );

                    // if 32nd entry is 0 means:
                    // either the day hasn't really started
                    // or the user hasn't contributed today
                    const length = userData.contributions.length;
                    if (!(customFromDate && customToDate)) {
                        if (userData.contributions[length - 1].contributionCount === 0) {
                            userData.contributions.pop();
                        }
                        const extra = userData.contributions.length - days;
                        userData.contributions.splice(0, extra);
                    }
                    return userData;
                }
            } else {
                console.error('Unexpected API response structure');
                throw new Error('Unexpected API response structure');
            }
        } catch (error) {
            console.log('error: ', error);
            return API_UNAVAILABLE_MESSAGE;
        }
    }
}
