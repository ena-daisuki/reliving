"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const accessToken = searchParams.get("accessToken") || "";
  const refreshToken = searchParams.get("refreshToken") || "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Successful!</h1>
      <p className="mb-4">
        You have successfully authenticated with YouTube. Here are your tokens:
      </p>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Access Token</h2>
        <div className="bg-gray-100 p-4 rounded-md mb-2 overflow-x-auto">
          <code className="break-all">{accessToken}</code>
        </div>
        <button
          onClick={() => copyToClipboard(accessToken)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Refresh Token</h2>
        <div className="bg-gray-100 p-4 rounded-md mb-2 overflow-x-auto">
          <code className="break-all">{refreshToken}</code>
        </div>
        <button
          onClick={() => copyToClipboard(refreshToken)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Next Steps</h2>
        <p>
          Add these tokens to your <code>.env.local</code> file:
        </p>
        <div className="bg-gray-100 p-4 rounded-md mt-2 overflow-x-auto">
          <pre>
            {`NEXT_PUBLIC_OWNER_YOUTUBE_ACCESS_TOKEN=${accessToken}
NEXT_PUBLIC_OWNER_YOUTUBE_REFRESH_TOKEN=${refreshToken}`}
          </pre>
        </div>
      </div>

      <Link
        href="/vlogs"
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Go to Vlogs
      </Link>
    </div>
  );
}
