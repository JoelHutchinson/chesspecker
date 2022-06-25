import type {ReactElement} from 'react';
import {useState} from 'react';
import {GetServerSidePropsContext, Redirect} from 'next';
import {NextSeo} from 'next-seo';
import dynamic from 'next/dynamic';
import {UserData} from './api/user/[id]';
import {PuzzleSetArrayData} from './api/setBy/[user]';
import Layout from '@/layouts/main';
import {User} from '@/models/user';
import {withSessionSsr} from '@/lib/session';
import {AchievementItem} from '@/models/achievement';
import {fetcher} from '@/lib/utils';
import PuzzleSetMap from '@/components/dashboard/puzzle-set-map';
import {PuzzleSet} from '@/models/puzzle-set';

const Modal = dynamic(async () => import('@/components/modal-achievement'));

type Props = {
	user: User;
	puzzleSets?: PuzzleSet[];
};

const DashbaordPage = ({user, puzzleSets}: Props) => {
	const [achievementsList, setList] = useState<AchievementItem[]>(
		user.validatedAchievements.filter(achievement => !achievement.claimed),
	);
	const [showModal, setShowModal] = useState(achievementsList.length > 0);

	const updateValidatedAchievement = async (achievementId: string) => {
		setShowModal(() => false);
		await fetch(`/api/achievement`, {
			method: 'PUT',
			body: JSON.stringify({achievementId, claimed: true}),
		});
		const list = achievementsList.filter(item => item.id !== achievementId);
		if (list.length > 0) setShowModal(() => true);
		setList(() => list);
	};

	return (
		<>
			<NextSeo title='♟ Dashboard' />
			<Modal
				showModal={showModal}
				currentAchievementItem={achievementsList[0]}
				handleClick={updateValidatedAchievement}
			/>
			<div className='flex flex-col items-center justify-center min-h-screen pt-24 pb-20 relative  '>
				<h1 className='p-5 mx-auto mt-8 mb-6 font-sans text-3xl font-bold text-center sm:text-4xl md:text-5xl'>
					Here are your sets!
				</h1>

				<PuzzleSetMap puzzleSets={puzzleSets} />
			</div>
		</>
	);
};

DashbaordPage.getLayout = (page: ReactElement) => <Layout>{page}</Layout>;
export default DashbaordPage;

export const getServerSideProps = withSessionSsr(
	async ({req}: GetServerSidePropsContext) => {
		const userID = req.session?.userID;
		const redirect: Redirect = {statusCode: 303, destination: '/'};
		if (!userID) return {redirect};

		const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
		const baseUrl = req ? `${protocol}://${req.headers.host!}` : '';
		const responseUser = await fetcher<UserData>(
			`${baseUrl}/api/user/${userID}`,
		);
		if (!responseUser?.success) return {redirect};

		const responseSet = await fetcher<PuzzleSetArrayData>(
			`${baseUrl}/api/setBy/${userID}`,
		);

		const puzzleSets = responseSet?.success ? responseSet.data : undefined;

		return {
			props: {
				user: responseUser.data,
				puzzleSets,
			},
		};
	},
);
