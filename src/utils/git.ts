import simpleGit from 'simple-git';

export interface LastCommit {
    hash: string;
    message: string;
    date: Date;
}

export async function getLastCommit(): Promise<LastCommit> {
    const git = simpleGit();

    try {
        const log = await git.log({ maxCount: 1 });
        const lastCommit = log.latest;

        if (!lastCommit) {
            throw new Error('No commits found');
        }

        return {
            hash: lastCommit.hash,
            message: lastCommit.message,
            date: new Date(lastCommit.date)
        };
    } catch (error) {
        console.error('Error getting last commit:', error);
        return {
            hash: 'unknown',
            message: 'Unable to fetch commit information',
            date: new Date()
        };
    }
} 