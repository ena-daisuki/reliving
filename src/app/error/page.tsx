"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const errorMessage =
    searchParams.get("message") || "An unknown error occurred";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4 text-red-600">
        Authentication Error
      </h1>

      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        <p>{errorMessage}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">What to do next</h2>
        <ul className="list-disc pl-5">
          <li className="mb-2">
            Check your Google Cloud Console settings to ensure the YouTube API
            is enabled
          </li>
          <li className="mb-2">
            Verify that your OAuth credentials are correctly configured
          </li>
          <li className="mb-2">
            Make sure your redirect URI matches exactly what&apos;s configured
            in Google Cloud Console
          </li>
          <li className="mb-2">Try authenticating again</li>
        </ul>
      </div>

      <div className="flex space-x-4">
        <Link
          href="/api/youtube/auth"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Try Again
        </Link>
        <Link
          href="/vlogs"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Vlogs
        </Link>
      </div>
    </div>
  );
}
