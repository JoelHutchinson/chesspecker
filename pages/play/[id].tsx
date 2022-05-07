import {useState, useEffect, useCallback, ReactElement} from 'react';
import * as ChessJS from 'chess.js';
import {ChessInstance, Square, ShortMove} from 'chess.js';
import type {Config} from 'chessground/config';
import {useAtom} from 'jotai';
import {useRouter} from 'next/router';
import type {GetServerSidePropsContext, Redirect} from 'next';
import {
	PuzzleInterface,
	PuzzleItemInterface,
	PuzzleSetInterface,
	AchivementsArgs,
} from '@/types/models';
import Layout from '@/layouts/main';
import {sortBy} from '@/lib/utils';
import useEffectAsync from '@/hooks/use-effect-async';
import audio from '@/lib/sound';
import {configµ, orientationµ, animationµ, playµ} from '@/lib/atoms';
import useModal from '@/hooks/use-modal';
import useUser from '@/hooks/use-user';
import Timer from '@/components/play/timer';
import useKeyPress from '@/hooks/use-key-press';
import {ButtonLink as Button} from '@/components/button';
import {checkForAchievement} from '@/lib/achievements';
import Notification from '@/components/notification';
import useStreak from '@/hooks/use-streak';
import {withSessionSsr} from '@/lib/session';
import {get as get_, update as update_, UpdateUser} from '@/lib/play';
import Board from '@/components/play/board';
import RightBar from '@/components/play/right-bar';
import BottomBar from '@/components/play/bottom-bar';
import {PreviousPuzzle} from '@/components/play/bottom-bar/history';

const Chess = typeof ChessJS === 'function' ? ChessJS : ChessJS.Chess;
const getColor = (string_: 'w' | 'b') => (string_ === 'w' ? 'white' : 'black');

type Props = {set: PuzzleSetInterface};
const PlayingPage = ({set}: Props) => {
	const [hasAutoMove] = useAtom(configµ.autoMove);
	const [hasSound] = useAtom(configµ.sound);

	const [isSolutionClicked, setIsSolutionClicked] = useAtom(playµ.solution);
	const [initialPuzzleTimer, setInitialPuzzleTimer] = useAtom(playµ.timer);
	const [, setTotalPuzzles] = useAtom(playµ.totalPuzzles);
	const [isComplete, setIsComplete] = useAtom(playµ.isComplete);
	const [, setCompletedPuzzles] = useAtom(playµ.completed);

	const [orientation, setOrientation] = useAtom(orientationµ);
	const [, setAnimation] = useAtom(animationµ);

	const [chess, setChess] = useState<ChessInstance>(new Chess());
	const [config, setConfig] = useState<Partial<Config>>();
	const [puzzleList, setPuzzleList] = useState<PuzzleItemInterface[]>([]);
	const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
	const [puzzle, setPuzzle] = useState<PuzzleInterface>();
	const [moveNumber, setMoveNumber] = useState(0);
	const [moveHistory, setMoveHistory] = useState<string[]>([]);
	const [lastMove, setLastMove] = useState<Square[]>([]);
	const [previousPuzzle, setPreviousPuzzle] = useState<PreviousPuzzle[]>([]);
	const [totalMistakes, setTotalMistakes] = useState(0);
	const [mistakes, setMistakes] = useState(0);
	const [initialSetTimer, setInitialSetTimer] = useState<number>(0);
	const [timerSum, setTimerSum] = useState<number>(0);
	const [isRunning, setIsRunning] = useState(true);
	const [pendingMove, setPendingMove] = useState<Square[]>([]);
	const {isOpen, show, hide} = useModal();
	const router = useRouter();
	const {user, mutate} = useUser();
	const streak = useStreak(user._id.toString(), user.streak);

	// For achievement
	const [streakMistakes, setStreakMistakes] = useState(0);
	const [streakTime, setStreakTime] = useState(0);
	const [showNotification, setShowNotification] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState('');
	const [notificationUrl, setNotificationUrl] = useState('');

	/**
	 * Extract the list of puzzles.
	 */
	useEffect(() => {
		setInitialSetTimer(() => set.currentTime);
		setCompletedPuzzles(() => set.progression);
		setTotalPuzzles(() => set.length);
		const puzzleList = set.puzzles.filter(p => !p.played);
		setPuzzleList(() => sortBy(puzzleList, 'order'));
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, [set.puzzles, set.currentTime]);

	/**
	 * Retrieve current puzzle.
	 */
	useEffectAsync(async () => {
		if (!puzzleList[puzzleIndex] || puzzleList.length === 0) return;
		const nextPuzzle = puzzleList[puzzleIndex];
		const data = await get_.puzzle(nextPuzzle._id.toString());
		if (data.success) setPuzzle(() => data.puzzle);
	}, [puzzleList, puzzleIndex]);

	/**
	 * Setup the board.
	 */
	useEffect(() => {
		if (!puzzle?.Moves) return;
		const chess = new Chess(puzzle.FEN);
		setChess(() => chess);
		setMoveHistory(() => puzzle.Moves.split(' '));
		setMoveNumber(() => 0);
		setLastMove(() => []);
		setIsComplete(() => false);
		setPendingMove(() => undefined);
		setOrientation(() => (chess.turn() === 'b' ? 'white' : 'black'));
		setInitialPuzzleTimer(() => Date.now());
		setIsSolutionClicked(() => false);

		const config: Partial<Config> = {
			fen: chess.fen(),
			check: chess.in_check(),
			animation: {enabled: true, duration: 50},
			turnColor: getColor(chess.turn()),
			highlight: {
				lastMove: true,
				check: true,
			},
			premovable: {enabled: false},
			movable: calcMovable(),
			coordinates: true,
		};

		setConfig(previousConfig => ({...previousConfig, ...config}));
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, [puzzle]);

	type BodyData = {
		didCheat: boolean;
		mistakes: number;
		timeTaken: number;
		streak: number;
	};

	const getGrade = useCallback(
		({didCheat, mistakes, timeTaken, streak = 0}: BodyData) => {
			if (didCheat || mistakes >= 3) return 1;
			if (mistakes === 2 || (mistakes === 1 && timeTaken >= 20)) return 2;
			if (mistakes === 1 || timeTaken >= 20) return 3;
			if (timeTaken >= 6) return 4;
			if (streak < 2) return 5;
			return 6;
		},
		[],
	);

	/**
	 * Push the data of the current puzzle when complete.
	 */
	const updateFinishedPuzzle = useCallback(async () => {
		const timeTaken = (Date.now() - initialPuzzleTimer) / 1000;
		setStreakMistakes(previous => (mistakes === 0 ? previous + 1 : 0));
		setStreakTime(previous => (timeTaken < 5 ? previous + 1 : 0));
		const timeWithoutMistakes = Number.parseInt(timeTaken.toFixed(2), 10);
		const timeWithMistakes = timeTaken + 3 * mistakes;
		setTimerSum(previous => previous + timeWithMistakes);
		const oldThemes = user.puzzleSolvedByCategories;

		let updateUserData: UpdateUser = {
			$inc: {
				totalPuzzleSolved: 1,
			},
		};

		// Is there some puzzles in common in the old and new themes?
		const newThemesIds = puzzle.Themes;
		const themesInCommon = oldThemes.filter(t =>
			newThemesIds.includes(t.title),
		);

		if (themesInCommon.length > 0) {
			// If there are, we update the user's themes
			for (const theme of themesInCommon) {
				updateUserData.$inc[
					`puzzleSolvedByCategories.${oldThemes.indexOf(theme)}.count`
				] = 1;
			}
		}

		try {
			await update_.user(user._id.toString(), updateUserData);
		} catch (error: unknown) {
			console.log(error);
		}

		// Is there some themes not in common?
		const oldThemesIds = new Set(oldThemes.map(t => t.title));
		const themesNotInCommon = newThemesIds.filter(id => !oldThemesIds.has(id));

		if (themesNotInCommon.length > 0) {
			// If there are, we add them to the user's themes
			updateUserData = {
				$push: {
					puzzleSolvedByCategories: {
						$each: [],
					},
				},
			};
			for (const theme of themesNotInCommon) {
				updateUserData.$push.puzzleSolvedByCategories.$each.push({
					title: theme,
					count: 1,
				});
			}

			try {
				await update_.user(user._id.toString(), updateUserData);
			} catch (error: unknown) {
				console.log(error);
			}
		}

		const body: AchivementsArgs = {
			streakMistakes,
			streakTime,
			completionTime: timeWithoutMistakes,
			completionMistakes: mistakes,
			totalPuzzleSolved: user.totalPuzzleSolved
				? user.totalPuzzleSolved + 1
				: 1,
			themes: puzzle.Themes.map(t => {
				const a = oldThemes.find(c => t === c.title);
				const count = a ? a.count + 1 : 1;
				return {title: t, count};
			}),
			totalSetSolved: user.totalSetCompleted,
			streak,
			isSponsor: user.isSponsor,
		};

		const unlockedAchievements = await checkForAchievement(body);
		const puzzleItem = puzzleList[puzzleIndex];

		if (unlockedAchievements.length > 0) {
			setShowNotification(() => true);
			setNotificationMessage(() => 'Achievement unlocked!');
			setNotificationUrl(() => '/dashboard');
		}

		const newGrade = getGrade({
			didCheat: isSolutionClicked,
			mistakes,
			timeTaken: timeWithoutMistakes,
			streak: puzzleItem.streak,
		});

		const update = {
			$inc: {
				'puzzles.$.count': 1,
				currentTime: timeWithMistakes,
				progression: 1,
			},
			$push: {
				'puzzles.$.mistakes': mistakes,
				'puzzles.$.timeTaken': timeWithoutMistakes,
				'puzzles.$.grades': newGrade,
			},
			$set: {
				'puzzles.$.played': true,
				'puzzles.$.streak': puzzleItem.streak ? puzzleItem.streak + 1 : 0,
			},
		};

		try {
			const result = await update_.puzzle(
				set._id.toString(),
				puzzleItem._id.toString(),
				update,
			);
			/* eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare */
			if (result.success === false) {
				console.log(result.error);
				return;
			}

			const grades = result.puzzle.grades;
			setPreviousPuzzle(previous => [
				...previous,
				{
					grade: grades[grades.length - 1],
					PuzzleId: result.puzzle._id.toString(),
				},
			]);

			await mutate();
		} catch (error: unknown) {
			console.log(error);
		}
	}, [
		puzzleIndex,
		mistakes,
		puzzleList,
		initialPuzzleTimer,
		set._id,
		isSolutionClicked,
		getGrade,
	]);

	/**
	 * Called when puzzle is completed, switch to the next one.
	 */
	const changePuzzle = useCallback(async () => {
		await updateFinishedPuzzle();
		setCompletedPuzzles(previous => previous + 1);
		setMistakes(() => 0);
		setInitialPuzzleTimer(() => Date.now());
		setIsSolutionClicked(() => false);
		setPuzzleIndex(previousPuzzle => previousPuzzle + 1);
	}, [updateFinishedPuzzle]);

	const changeSet = useCallback(
		async () => router.push(`/view/${set._id.toString()}`),
		[set._id],
	);

	/**
	 * Push the data of the current set when complete.
	 */
	const updateFinishedSet = useCallback(async () => {
		const timeTaken = (Date.now() - initialSetTimer) / 1000;
		const formattedTime = Number.parseInt(timeTaken.toFixed(2), 10);
		const totalTime = formattedTime + timerSum + 1;

		const update = {
			$inc: {
				cycles: 1,
			},
			$push: {
				times: totalTime,
			},
			$set: {
				'puzzles.$[].played': false,
				currentTime: 0,
				progression: 0,
			},
		};

		try {
			await update_.set(set._id.toString(), update);
		} catch (error: unknown) {
			console.log(error);
		}
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, [initialSetTimer, mistakes, set, timerSum]);

	/**
	 * Called after each correct move.
	 */
	const checkSetComplete = useCallback(async () => {
		if (puzzleIndex + 1 !== puzzleList.length) return false;
		await audio('VICTORY', hasSound);
		await updateFinishedSet();
		return true;
	}, [puzzleIndex, hasSound, puzzleList.length, updateFinishedSet]);

	/**
	 * Called after each correct move.
	 */
	const checkPuzzleComplete = useCallback(
		async moveNumber => {
			if (moveNumber === moveHistory.length) {
				setAnimation(() => 'animate-finishMove');
				setTimeout(() => {
					setAnimation(() => '');
				}, 600);
				const isSetComplete = await checkSetComplete();
				if (isSetComplete) return changeSet();
				setIsComplete(() => true);
				await audio('GENERIC', hasSound, 0.3);
				if (hasAutoMove) {
					await changePuzzle();
					return true;
				}

				setIsRunning(() => false);
				return true;
			}

			return false;
		},
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
		[hasAutoMove, hasSound, changePuzzle, checkSetComplete, moveHistory.length],
	);

	/**
	 * Allow only legal moves.
	 */
	const calcMovable = useCallback((): Partial<Config['movable']> => {
		const dests = new Map();
		// FIXME: not working
		/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
		const color = getColor(chess.turn());
		for (const s of chess.SQUARES) {
			const ms = chess.moves({square: s, verbose: true});
			if (ms.length > 0)
				dests.set(
					s,
					ms.map(m => m.to),
				);
		}

		return {
			free: false,
			dests,
			showDests: true,
			color: 'both',
		};
	}, [chess]);

	/**
	 * Function making the computer play the next move.
	 */
	const computerMove = useCallback(
		async (index: number) => {
			if (!chess) return;
			const move = chess.move(moveHistory[index], {sloppy: true});
			if (!move) return;
			setConfig(config => ({
				...config,
				fen: chess.fen(),
				check: chess.in_check(),
				movable: calcMovable(),
				turnColor: getColor(chess.turn()),
				lastMove: [move.from, move.to],
			}));
			setMoveNumber(previousMove => previousMove + 1);
			await (move.captured
				? audio('CAPTURE', hasSound)
				: audio('MOVE', hasSound));
		},
		[chess, moveHistory, calcMovable, hasSound],
	);

	/**
	 * When the board is setup, make the first move.
	 */
	useEffect(() => {
		if (!moveHistory) return;
		if (moveNumber !== 0) return;
		setTimeout(async () => {
			await computerMove(0);
		}, 300);
	}, [moveHistory, computerMove, moveNumber]);

	useEffect(() => {
		setConfig(config => ({...config, lastMove}));
	}, [lastMove]);

	const onRightMove = useCallback(
		async (from: Square, to: Square) => {
			setConfig(config => ({
				...config,
				fen: chess.fen(),
				check: chess.in_check(),
				turnColor: getColor(chess.turn()),
				movable: calcMovable(),
				lastMove: [from, to],
			}));
			const currentMoveNumber = moveNumber + 1;
			setMoveNumber(previousMove => previousMove + 1);
			const isPuzzleComplete = await checkPuzzleComplete(currentMoveNumber);
			if (isPuzzleComplete) return;
			setAnimation(() => 'animate-rightMove');
			setTimeout(() => {
				setAnimation(() => '');
			}, 600);
			setTimeout(async () => {
				await computerMove(moveNumber + 1);
			}, 300);
		},
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
		[chess, moveNumber, checkPuzzleComplete, calcMovable, computerMove],
	);

	const onWrongMove = useCallback(async () => {
		chess.undo();
		setMistakes(previous => previous + 1);
		setTotalMistakes(previous => previous + 1);
		setAnimation('animate-wrongMove');
		setTimeout(() => {
			setAnimation(() => '');
		}, 600);
		await audio('ERROR', hasSound);
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, [chess, hasSound]);

	/**
	 * Function called when the user plays.
	 */
	const onMove = useCallback(
		async (from: Square, to: Square) => {
			const moves = chess.moves({verbose: true});
			for (const move_ of moves) {
				if (
					move_.from === from &&
					move_.to === to &&
					move_.flags.includes('p')
				) {
					setPendingMove([from, to]);
					show();
					return;
				}
			}

			const move = chess.move({from, to});
			if (move === null) return;

			await (move.captured
				? audio('CAPTURE', hasSound)
				: audio('MOVE', hasSound));

			const isCorrectMove =
				`${move.from}${move.to}` === moveHistory[moveNumber];
			if (isCorrectMove || chess.in_checkmate()) {
				await onRightMove(from, to);
				return;
			}

			await onWrongMove();
		},
		[chess, moveHistory, moveNumber, onRightMove, onWrongMove, hasSound, show],
	);

	/**
	 * Handle promotions via chessground.
	 */
	const promotion = useCallback(
		async (piece: ShortMove['promotion']) => {
			const from = pendingMove[0];
			const to = pendingMove[1];
			const isCorrectMove = piece === moveHistory[moveNumber].slice(-1);
			const move = chess.move({from, to, promotion: piece});
			if (move === null) return;

			await (move.captured
				? audio('CAPTURE', hasSound)
				: audio('MOVE', hasSound));

			if (isCorrectMove || chess.in_checkmate()) {
				await onRightMove(from, to);
				return;
			}

			await onWrongMove();
		},
		[
			pendingMove,
			moveHistory,
			moveNumber,
			chess,
			hasSound,
			onRightMove,
			onWrongMove,
		],
	);

	const fn = useCallback(async () => {
		if (!isComplete) return;
		await changePuzzle();
	}, [isComplete, changePuzzle]);

	const launchTimer = useCallback(() => {
		setIsRunning(() => true);
	}, []);

	useKeyPress({targetKey: 'Q', fn: async () => router.push('/dashboard')});
	useKeyPress({targetKey: 'q', fn: async () => router.push('/dashboard')});
	useKeyPress({targetKey: 'Escape', fn: async () => router.push('/dashboard')});
	useKeyPress({targetKey: 's', fn});
	useKeyPress({targetKey: 'S', fn});
	useKeyPress({targetKey: 'n', fn});
	useKeyPress({targetKey: 'N', fn});

	return (
		<>
			<div className='m-0 flex min-h-screen w-screen flex-col justify-center pt-32 pb-24 text-slate-800'>
				<div className='flex flex-row justify-center gap-2'>
					<Timer
						value={initialSetTimer}
						mistakes={totalMistakes}
						isRunning={isRunning}
					/>
					<Button
						className='my-2 w-36 items-center rounded-md bg-gray-800 leading-8 text-white'
						href='/dashboard'
					>
						LEAVE 🧨
					</Button>
				</div>
				<div className='flex w-full flex-col items-center justify-center md:flex-row  '>
					<div className='hidden w-36 md:invisible md:block ' />
					<div className='max-w-[33rem] w-11/12 md:w-full  flex-auto  '>
						<Board
							config={{...config, orientation, events: {move: onMove}}}
							isOpen={isOpen}
							hide={hide}
							color={getColor(chess.turn())}
							onPromote={promotion}
						/>

						<BottomBar puzzles={previousPuzzle} />
					</div>
					<RightBar
						answer={moveHistory[moveNumber]}
						changePuzzle={changePuzzle}
						launchTimer={launchTimer}
					/>
				</div>
			</div>
			<Notification
				text={notificationMessage}
				isVisible={showNotification}
				url={notificationUrl}
				setShow={setShowNotification}
			/>
		</>
	);
};

PlayingPage.getLayout = (page: ReactElement) => <Layout>{page}</Layout>;
export default PlayingPage;

interface SSRProps extends GetServerSidePropsContext {
	params: {id: string | undefined};
}

export const getServerSideProps = withSessionSsr(
	async ({params, req}: SSRProps) => {
		if (!req?.session?.userID) {
			const redirect: Redirect = {statusCode: 303, destination: '/'};
			return {redirect};
		}

		const id: string = params.id;
		const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
		const baseUrl = req ? `${protocol}://${req.headers.host}` : '';
		const data = await get_.set(baseUrl, id);
		if (!data.success) return {notFound: true};
		if (data.set.user.toString() !== req.session.userID) {
			const redirect: Redirect = {statusCode: 303, destination: '/dashboard'};
			return {redirect};
		}

		return {props: {set: data.set}};
	},
);
