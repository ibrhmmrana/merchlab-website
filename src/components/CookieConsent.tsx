"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie, Shield } from 'lucide-react';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Cookie className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cookie Consent</h3>
              <p className="text-sm text-gray-600">We respect your privacy</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-green-900 mb-1">Strictly Necessary Cookies</h4>
                <p className="text-xs text-green-700">
                  These cookies are essential for the website to function properly. They enable basic functions like page navigation, 
                  form submissions, and access to secure areas of the website.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              We only use strictly necessary cookies that are required for the website to function. 
              No tracking, analytics, or marketing cookies are used.
            </p>

            <div className="flex gap-3">
              <Button 
                onClick={handleAccept}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Accept & Continue
              </Button>
              <Button 
                onClick={handleDecline}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Decline
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By continuing to use this site, you consent to our use of strictly necessary cookies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
