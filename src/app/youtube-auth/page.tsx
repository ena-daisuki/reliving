"use client";

import Link from "next/link";

export default function YouTubeAuthPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">YouTube Authentication</h1>

      <div className="mb-6">
        <p className="mb-4">
          To use YouTube features, you need to authenticate with your YouTube
          account. Click the button below to start the authentication process.
        </p>

        <Link
          href="/api/youtube/auth"
          className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
          Authenticate with YouTube
        </Link>
      </div>

      <div className="bg-gray-100 p-4 rounded-md mb-6">
        <h2 className="text-xl font-semibold mb-2">What happens next?</h2>
        <ol className="list-decimal pl-5">
          <li className="mb-2">
            You&apos;ll be redirected to Google&apos;s authentication page
          </li>
          <li className="mb-2">Sign in with your YouTube account</li>
          <li className="mb-2">Grant the requested permissions</li>
          <li className="mb-2">
            You&apos;ll be redirected back with your new tokens
          </li>
          <li className="mb-2">Copy the tokens to your .env.local file</li>
        </ol>
      </div>

      <Link href="/vlogs" className="text-blue-500 hover:underline">
        Back to Vlogs
      </Link>
    </div>
  );
}
