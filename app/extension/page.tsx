"use client";

import { useState } from "react";

export default function ExtensionInstallPage() {
  const [copied, setCopied] = useState(false);
  const extensionPath = "C:/Users/dskal/.vscode/GatorGreen/extension";

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(extensionPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-bold text-emerald-800 mb-4">Install the Chrome Extension</h1>
        <p className="text-gray-700 mb-6">
          Follow these steps to load the WattWise Chrome extension locally and start using it.
        </p>

        <ol className="list-decimal list-inside space-y-4 text-gray-800">
          <li>
            Open Chrome and navigate to <span className="font-semibold">chrome://extensions/</span>.
          </li>
          <li>Enable <span className="font-semibold">Developer mode</span> (toggle in the top right).</li>
          <li>Click <span className="font-semibold">Load unpacked</span>.</li>
          <li>
            Select the folder: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{extensionPath}</span>
            <button
              onClick={copyPath}
              className="ml-3 px-3 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {copied ? "Copied!" : "Copy Path"}
            </button>
          </li>
          <li>Click <span className="font-semibold">Select Folder</span>. You should see "WattWise" appear in the list.</li>
          <li>Optionally pin the extension: click the puzzle icon, then the pin next to WattWise.</li>
        </ol>

        <div className="mt-8 p-4 bg-emerald-50 rounded border border-emerald-200">
          <h2 className="text-xl font-semibold text-emerald-800 mb-2">Credentials (for demo)</h2>
          <p className="text-sm text-gray-700 mb-2">Open the extension popup, click ⚙️ Settings, then enter:</p>
          <pre className="bg-white border rounded p-3 text-sm overflow-auto">
{`Nessie API Key:     99864d500fa931ec644d3a5d865a866c
Main Account ID:    69753af095150878eafea16f
Savings Account ID: 69753af095150878eafea170`}
          </pre>
          <p className="text-sm text-gray-700 mt-2">Click Save Settings, then Test Connection.</p>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded border">
          <h2 className="text-xl font-semibold mb-2">Tips</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-800">
            <li>Works on amazon.com and bestbuy.com product pages.</li>
            <li>If buttons don’t respond, refresh the extension in chrome://extensions/.</li>
            <li>See detailed steps in <span className="font-semibold">extension/SETUP_GUIDE.md</span> inside the project.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
