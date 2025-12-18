'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, CheckCircle2, XCircle, Copy, ExternalLink } from 'lucide-react';

export default function RefreshTokenClient() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    refresh_token?: string;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract code from URL if present
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
    }
  }, [searchParams]);

  const handleExchange = async () => {
    if (!code.trim()) {
      setResult({ success: false, error: 'Please enter an authorization code' });
      return;
    }

    setLoading(true);
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch('/api/admin/orders/exchange-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.error || 'Failed to exchange code',
        });
        return;
      }

      setResult({
        success: true,
        message: data.message,
        refresh_token: data.refresh_token,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exchange code',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.refresh_token) {
      navigator.clipboard.writeText(result.refresh_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGetAuthUrl = async () => {
    try {
      const response = await fetch('/api/admin/orders/get-refresh-token');
      const data = await response.json();
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
    }
  };

  return (
    <div className="p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Barron API Token Setup</CardTitle>
          <CardDescription>
            Exchange your authorization code for a refresh token. The token will be automatically saved to the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Get Authorization URL */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">Step 1: Get Authorization URL</h3>
            <Button
              onClick={handleGetAuthUrl}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Authorization URL
            </Button>
            <p className="text-xs text-gray-500">
              Sign in with: <strong>info@merchlab.io</strong> / <strong>M3rch$h0p</strong>
            </p>
          </div>

          {/* Step 2: Enter Code */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">Step 2: Enter Authorization Code</h3>
            <p className="text-xs text-gray-500 mb-2">
              After authorization, you&apos;ll be redirected to a callback URL. Copy the <code className="bg-gray-100 px-1 rounded">code</code> parameter from that URL.
            </p>
            <Input
              type="text"
              placeholder="Paste authorization code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleExchange}
              disabled={loading || !code.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exchanging...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Exchange Code for Token
                </>
              )}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border-2 ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {result.success ? (
                    <>
                      <h4 className="font-semibold text-green-900 mb-2">Success!</h4>
                      <p className="text-sm text-green-800 mb-3">{result.message}</p>
                      {result.refresh_token && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-green-900">Refresh Token:</p>
                            <Button
                              onClick={handleCopy}
                              variant="outline"
                              size="sm"
                              className="h-7"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="bg-white p-2 rounded border border-green-200">
                            <code className="text-xs text-gray-700 break-all">
                              {result.refresh_token}
                            </code>
                          </div>
                          <p className="text-xs text-green-700 mt-2">
                            ✅ Token has been automatically saved to the database. No further action needed!
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-red-900 mb-2">Error</h4>
                      <p className="text-sm text-red-800">{result.error}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">How it works:</h4>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click &quot;Open Authorization URL&quot; to start the OAuth flow</li>
              <li>Sign in with the credentials shown above</li>
              <li>You&apos;ll be redirected to a callback URL with a <code className="bg-blue-100 px-1 rounded">code</code> parameter</li>
              <li>Copy the entire code value from the URL</li>
              <li>Paste it here and click &quot;Exchange Code for Token&quot;</li>
              <li>The refresh token will be automatically saved to the database</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

