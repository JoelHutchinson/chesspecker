/* eslint-disable unicorn/no-array-reduce */
/* eslint-disable unicorn/no-array-callback-reference */
import {GetServerSideProps} from 'next';
import {ReactElement, useEffect, useState} from 'react';
import {ArrowSmDownIcon, ArrowSmUpIcon} from '@heroicons/react/solid';
import type {Data as SetData} from '@/api/set/[id]';
import Layout from '@/layouts/main';
import {PuzzleItemInterface, PuzzleSetInterface} from '@/types/models';
import {
	getCurrentRunStats,
	getOverviewStats,
	getProgressStats,
	ViewData,
} from '@/lib/view';

const reducer = (accumulator: number, current: number) => accumulator + current;
const classNames = (...classes: string[]) => classes.filter(Boolean).join(' ');

const Block = ({
	title,
	stat,
	type,
	change,
	Icon,
	hasChange,
}: ViewData): JSX.Element => {
	if (!hasChange)
		return (
			<div className='m-3 flex min-h-[10rem] min-w-[20rem] flex-auto flex-col items-center px-4 py-5 overflow-hidden bg-sky-700 dark:bg-white rounded-lg shadow sm:pt-6 sm:px-6'>
				<h3 className='text-sm font-medium text-center text-white dark:text-gray-500'>
					{title}
				</h3>
				<div className='flex items-center justify-center w-full h-full'>
					{Icon && (
						<div className=' p-3 rounded-md bg-white dark:bg-sky-700 mr-2'>
							<Icon
								className='w-6 h-6 text-sky-700 dark:text-white'
								aria-hidden='true'
							/>
						</div>
					)}
					<p className='text-2xl font-semibold text-white dark:text-gray-900 justify-self-center'>
						{stat}
					</p>
				</div>
			</div>
		);

	return (
		<div className='m-3 flex min-h-[10rem] min-w-[20rem] flex-auto flex-col items-center px-4 py-5 overflow-hidden bg-white dark:bg-sky-700 rounded-lg shadow sm:pt-6 sm:px-6'>
			{Icon && (
				<div className='absolute p-3 rounded-md bg-sky-700'>
					<Icon className='w-6 h-6 text-white' aria-hidden='true' />
				</div>
			)}
			<h3 className='text-sm font-medium text-center text-gray-500'>{title}</h3>
			<div className='flex items-center justify-center w-full h-full'>
				<p className='text-2xl font-semibold text-white dark:text-gray-900 justify-self-center'>
					{stat}
				</p>
				<p
					className={classNames(
						type === 'up' ? 'text-green-600' : 'text-red-600',
						'ml-2 flex items-baseline text-sm font-semibold',
					)}
				>
					{type === 'up' ? (
						<ArrowSmUpIcon
							className='self-center flex-shrink-0 w-5 h-5 text-green-500'
							aria-hidden='true'
						/>
					) : (
						<ArrowSmDownIcon
							className='self-center flex-shrink-0 w-5 h-5 text-red-500'
							aria-hidden='true'
						/>
					)}
					<span className='sr-only'>
						{type === 'up' ? 'Increased' : 'Decreased'} by
					</span>
					{change}
				</p>
			</div>
		</div>
	);
};

const getClasses = (grade: number) => {
	const base = 'h-5 w-10 cursor-pointer rounded-sm mb-1';
	if (grade < 3) return `${base} bg-red-500`;
	if (grade < 5) return `${base} bg-orange-500`;
	if (grade < 7) return `${base} bg-green-500`;
};

const getAverage = (array: number[]): number =>
	array.reduce(reducer, 0) / array.length;

const PuzzleComponent = (puzzle: PuzzleItemInterface): JSX.Element => (
	<a
		key={puzzle.PuzzleId}
		href={`https://lichess.org/training/${puzzle.PuzzleId}`}
		className={getClasses(getAverage(puzzle.grades))}
		target='_blank'
		rel='noreferrer'
	/>
);

type Props = {currentSetProps: PuzzleSetInterface};
const ViewingPage = ({currentSetProps: set}: Props) => {
	const [overviewStats, setOverviewStats] = useState<ViewData[]>([]);
	const [progressStats, setProgressStats] = useState<ViewData[]>([]);
	const [currentRunStats, setCurrentRunStats] = useState<ViewData[]>([]);

	useEffect(() => {
		if (!set) return;
		const overviewStats: ViewData[] = getOverviewStats(set);
		setOverviewStats(() => overviewStats);
		console.log('overviewStats', overviewStats);

		const globalProgressStats: ViewData[] = getProgressStats(set);
		setProgressStats(() => globalProgressStats);
		console.log('globalProgressStats', globalProgressStats);

		const currentRunStats: ViewData[] = getCurrentRunStats(set);
		setCurrentRunStats(() => currentRunStats);
	}, [set]);

	if (!set || !set.puzzles) return null;
	return (
		<div className='flex flex-col w-screen min-h-screen px-2 pt-32 pb-24 m-0 sm:px-12'>
			<h1 className='p-5 mt-8 mb-6 font-sans text-3xl font-bold md:text-5xl'>
				{set.title}
			</h1>

			<div className='w-full mt-4'>
				<h2 className='h2'>Set overview</h2>
				<div className='flex flex-wrap w-full mt-4'>
					{overviewStats.map(stat => (
						<Block key={stat.title} {...stat} />
					))}
				</div>
			</div>
			<div className='w-full mt-4'>
				<h2 className='h2'>Global progress</h2>
				<div className='flex flex-wrap w-full mt-4'>
					{progressStats.map(stat => (
						<Block key={stat.title} {...stat} />
					))}
				</div>
			</div>
			{set?.currentTime > 0 && (
				<div className='flex-wrap w-full mt-4'>
					<h2 className='h2'>Current run</h2>
					<div className='flex flex-wrap justify-around w-full mt-4'>
						{currentRunStats.map(stat => (
							<Block key={stat.title} {...stat} />
						))}
					</div>
				</div>
			)}

			<div className='flex-wrap w-full mt-4'>
				<h2 className='mb-4 h2'>All puzzles</h2>
				<div className='flex flex-row flex-wrap w-full gap-2 mb-4'>
					{set.puzzles.map(puzzle => (
						<PuzzleComponent key={puzzle.PuzzleId} {...puzzle} />
					))}
				</div>
			</div>
		</div>
	);
};

ViewingPage.getLayout = (page: ReactElement): JSX.Element => (
	<Layout>{page}</Layout>
);
export default ViewingPage;

export const getServerSideProps: GetServerSideProps = async ({req, params}) => {
	const id: string = params.id as string;
	const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
	const baseUrl = req ? `${protocol}://${req.headers.host}` : '';
	const data = await fetch(`${baseUrl}/api/set/${id}`).then(
		async response => response.json() as Promise<SetData>,
	);
	if (!data?.success) return {notFound: true};
	return {props: {currentSetProps: data.set}};
};
