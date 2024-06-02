import type {ReactElement} from 'react';
import Layout from '@/layouts/login';
import {NextSeo} from 'next-seo';

const PrivacyPolicyPage = () => {
	return (
		<>
			<NextSeo title='Privacy Policy' />
			<div className='flex flex-col items-center justify-center min-h-screen pt-12 md:pt-24 pb-40'>
				<h1 className='p-5 mx-auto mt-8 mb-6 font-sans text-3xl font-bold text-center'>
					Privacy Policy
				</h1>
				<p className='w-11/12 mb-6 text-2xl text-left md:text-2xl max-w-md lg:max-w-3xl'>
					Privacy policy goes here
				</p>
			</div>
		</>
	);
};

PrivacyPolicyPage.getLayout = (page: ReactElement) => <Layout>{page}</Layout>;
export default PrivacyPolicyPage;
