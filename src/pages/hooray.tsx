import type {ReactElement} from 'react';
import Layout from '@/layouts/login';
import {NextSeo} from 'next-seo';

const HoorayPage = () => {
	return (
		<>
			<NextSeo title='🎉 Hooray!' />
			<div className='flex flex-col items-center justify-center min-h-screen pt-12 md:pt-24 pb-40'>
				<h1 className='p-5 mx-auto mt-8 mb-6 font-sans text-3xl font-bold text-center'>
					Chesspecker is back! 🎉
				</h1>
				<p className='w-11/12 mb-6 text-2xl text-left md:text-2xl max-w-md lg:max-w-3xl'>
					We are happy to announce that the chesspecker tool has been revived.
					The creators of Chesspecker shut down the service due to rising server
					costs. The new team is dedicated to keeping the service alive and
					improving it. Therefore, we have made the decision to run ads on the
					website to cover the server costs. This should ensure that the service
					is self-sufficient regardless of how many users it has, and can be
					used by everyone for free.
				</p>
				<iframe
					allowFullScreen
					sandbox='allow-scripts'
					src='https://giphy.com/embed/o75ajIFH0QnQC3nCeD'
					width='480'
					height='372'
					frameBorder='0'
					className='giphy-embed'
				/>
			</div>
		</>
	);
};

HoorayPage.getLayout = (page: ReactElement) => <Layout>{page}</Layout>;
export default HoorayPage;
