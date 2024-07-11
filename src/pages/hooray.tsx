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
					costs.
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
