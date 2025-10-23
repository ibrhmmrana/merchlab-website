import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-white rounded-lg p-2">
                    <Image
                      src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Logo.png"
                      alt="MerchLab"
                      width={120}
                      height={40}
                      className="h-10 w-auto"
                    />
                  </div>
                </div>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Your trusted partner for custom merchandise and branding solutions. 
              We help businesses create memorable experiences through quality products.
            </p>
                <div className="flex space-x-4 mb-6">
                  <a href="https://www.instagram.com/merchlabza?igsh=MWRubnI1MW90d3ltNg==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                    <Image
                      src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ig%20logo2.png"
                      alt="Instagram"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </a>
                </div>
            <div className="text-sm text-gray-300">
              <p className="mb-3 font-medium">We Accept</p>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                  <Image
                    src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/visa-logo.DL5oylJw.svg"
                    alt="Visa"
                    width={40}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                  <Image
                    src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/Mastercard-Logo.png"
                    alt="Mastercard"
                    width={40}
                    height={24}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div className="md:col-start-3 md:col-end-4">
            <h4 className="text-sm font-semibold text-white mb-4">Shop</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Link href="/shop?category=Apparel" className="text-gray-300 hover:text-white text-sm">
                Apparel
              </Link>
              <Link href="/shop?category=Bags" className="text-gray-300 hover:text-white text-sm">
                Bags
              </Link>
              <Link href="/shop?category=Chef Wear" className="text-gray-300 hover:text-white text-sm">
                Chef Wear
              </Link>
              <Link href="/shop?category=Display" className="text-gray-300 hover:text-white text-sm">
                Display
              </Link>
              <Link href="/shop?category=Gifting" className="text-gray-300 hover:text-white text-sm">
                Gifting
              </Link>
              <Link href="/shop?category=Headwear" className="text-gray-300 hover:text-white text-sm">
                Headwear
              </Link>
              <Link href="/shop?category=Homeware" className="text-gray-300 hover:text-white text-sm">
                Homeware
              </Link>
              <Link href="/shop?category=Sports" className="text-gray-300 hover:text-white text-sm">
                Sports
              </Link>
              <Link href="/shop?category=Sublimation" className="text-gray-300 hover:text-white text-sm">
                Sublimation
              </Link>
              <Link href="/shop?category=Workwear" className="text-gray-300 hover:text-white text-sm">
                Workwear
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex flex-wrap gap-6 text-sm text-gray-300 mb-4 md:mb-0">
                  <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                  <Link href="/cookies" className="hover:text-white transition-colors">Cookies Policy</Link>
                  <Link href="/popia" className="hover:text-white transition-colors">POPIA</Link>
                  <Link href="/paia" className="hover:text-white transition-colors">PAIA</Link>
                </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-300 mb-2">
                © 2025 MerchLab. All rights reserved.
              </p>
              <p className="text-xs text-gray-400">
                Custom merchandise solutions for businesses across South Africa
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}