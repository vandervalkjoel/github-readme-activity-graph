import { Fetcher, UNKNOWN_USER_MESSAGE, API_UNAVAILABLE_MESSAGE } from '../src/fetcher';
import {
    mockQueryCorrect,
    mockQueryIncorrect,
    mockFetchCorrect,
    mockFetchIncorrect,
} from './mockFunctions';
import { expectedQuery } from './fakeInputs';
import { UserDetails } from '../src/interfaces/interface';

describe('Fetching Tests', () => {
    const fetcher = new Fetcher('ashutosh00710');
    it('Query Test', () => {
        const expected = expectedQuery(
            'ashutosh00710',
            '2022-05-01T00:00:00.000+00:00',
            '2022-06-01T00:00:00.000+00:00',
        );
        expect(
            // @ts-ignore: testing private method
            fetcher.getGraphQLQuery(
                '2022-05-01T00:00:00.000+00:00',
                '2022-06-01T00:00:00.000+00:00',
            ),
        ).toEqual(expected);
    });

    it('Fetching Contributions Test', () => {
        // @ts-ignore: mocking private method
        fetcher.getGraphQLQuery = mockQueryCorrect;
        // @ts-ignore: mocking private method
        fetcher.fetch = mockFetchCorrect;

        fetcher.fetchContributions(31).then(
            //@ts-ignore: will always return data of type userDetails
            (data: UserDetails) => {
                expect(data.contributions).toEqual(expect.any(Array));
                expect(data.contributions.length).toEqual(31);
                expect(data.name).toEqual('Ashutosh Dwivedi');
            },
        );

        // @ts-ignore: mocking private method
        fetcher.getGraphQLQuery = mockQueryIncorrect;
        // @ts-ignore: mocking private method
        fetcher.fetch = mockFetchIncorrect;

        // @ts-ignore: this will always return a string
        fetcher.fetchContributions().then((data: string) => {
            expect(data).toEqual(`Can't fetch any contribution. Please check your username 😬`);
        });
    });

    describe('Retrying transient failures', () => {
        const makeFetcher = () => {
            const f = new Fetcher('ashutosh00710');
            f.retryDelaysMs = [0, 0];
            // @ts-ignore: mocking private method
            f.getGraphQLQuery = mockQueryCorrect;
            return f;
        };

        it('recovers when a later attempt succeeds', async () => {
            const f = makeFetcher();
            const correct = mockFetchCorrect();
            const fetchMock = jest
                .fn()
                .mockRejectedValueOnce(new Error('502 Bad Gateway'))
                .mockResolvedValueOnce(correct);
            // @ts-ignore: mocking private method
            f.fetch = fetchMock;

            const data = (await f.fetchContributions(31)) as UserDetails;
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(data.contributions.length).toEqual(31);
        });

        it('reports the API as unavailable, not the username, once retries run out', async () => {
            const f = makeFetcher();
            const fetchMock = jest.fn().mockRejectedValue(new Error('timeout'));
            // @ts-ignore: mocking private method
            f.fetch = fetchMock;

            expect(await f.fetchContributions(31)).toEqual(API_UNAVAILABLE_MESSAGE);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it('does not retry an unknown user', async () => {
            const f = makeFetcher();
            const fetchMock = jest.fn().mockResolvedValue(mockFetchIncorrect());
            // @ts-ignore: mocking private method
            f.fetch = fetchMock;

            expect(await f.fetchContributions(31)).toEqual(UNKNOWN_USER_MESSAGE);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });
});
