import type {ReactElement} from 'react';
import {useState} from 'react';
import {GetServerSidePropsContext, Redirect} from 'next';
import {NextSeo} from 'next-seo';
import dynamic from 'next/dynamic';
import Layout from '@/layouts/main';
import {User} from '@/models/user';
import {withSessionSsr} from '@/lib/session';
import {AchievementItem} from '@/models/achievement';
import PuzzleSetMap from '@/components/dashboard/puzzle-set-map';
import {PuzzleSet} from '@/models/puzzle-set';
import {get_} from '@/lib/api-helpers';
import {Banner} from '@/components/dashboard/banner';

const Modal = dynamic(async () => import('@/components/modal-achievement'));

type Props = {
	user: User;
	puzzleSets: PuzzleSet[];
};

const DashbaordPage = ({user, puzzleSets}: Props) => {
	const [isBannerOpen, setIsBannerOpen] = useState(true);

	const handleCloseBanner = () => {
		setIsBannerOpen(() => false);
	};

	const [achievList, setAchievList] = useState<AchievementItem[]>(
		user.validatedAchievements.filter(achievement => !achievement.claimed),
	);
	const [showModal, setShowModal] = useState(achievList.length > 0);

	const updateValidatedAchievement = async (achievementId: string) => {
		setShowModal(() => false);
		await fetch(`/api/achievement`, {
			method: 'PUT',
			body: JSON.stringify({achievementId, claimed: true}),
		});
		const list = achievList.filter(item => item.id !== achievementId);
		if (list.length > 0) setShowModal(() => true);
		setAchievList(() => list);
	};

	return (
		<>
			<NextSeo title='♟ Dashboard' />
			<Modal
				showModal={showModal}
				currentAchievementItem={achievList[0]!}
				handleClick={updateValidatedAchievement}
			/>
			<div className='flex flex-col items-center justify-center min-h-screen pt-12 md:pt-24 pb-20 relative'>
				{isBannerOpen && (
					<Banner handleCloseBanner={handleCloseBanner}>
						Chesspecker returns! 🎉
					</Banner>
				)}
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

		const responseUser = await get_.user(userID, baseUrl);
		if (!responseUser?.success) return {redirect};

		const responseSet = await get_.setByUser(userID, baseUrl);
		const puzzleSets = responseSet?.success ? responseSet.data : [];

		return {
			props: {
				user: responseUser.data,
				puzzleSets,
			},
		};
	},
);
