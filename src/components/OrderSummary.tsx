'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/store/cart';

export function OrderSummary() {
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    street: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fullEnquiryJson = JSON.stringify({
        items: items,
        customer: formData,
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullEnquiryJson,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const { metaPixel } = await import('@/lib/analytics/metaPixel');
        metaPixel.lead({ content_name: 'Quote (order summary)' });
        metaPixel.quoteSubmitted({ action: 'send', num_items: items.length });
        clear();
        alert('Quote submitted successfully! We\'ll get back to you soon.');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          street: '',
          suburb: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'South Africa'
        });
      } else {
        throw new Error('Failed to submit quote');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      alert('Failed to submit quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">
          Add some products to your cart to get started.
        </p>
        <Button asChild>
          <a href="/shop">Continue Shopping</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Cart Items */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Order Items</h2>
        
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.stock_id}>
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    {/* Create a simple SVG placeholder that loads instantly */}
                    <svg
                      width="80"
                      height="80"
                      viewBox="0 0 80 80"
                      className="w-full h-full"
                    >
                      <defs>
                        <linearGradient id={`gradient-order-${item.stock_id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>
                      </defs>
                      <rect width="80" height="80" fill={`url(#gradient-order-${item.stock_id})`} />
                      <text
                        x="40"
                        y="48"
                        textAnchor="middle"
                        className="text-white font-bold text-xl"
                        fill="white"
                      >
                        {item.brand?.charAt(0) || item.description?.charAt(0) || 'P'}
                      </text>
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground line-clamp-2">
                      {item.description}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.colour} • {item.size}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.stock_code}
                    </p>
                    {item.brandingMode === 'branded' && item.branding?.length ? (
                      <div className="mt-1.5 space-y-0.5">
                        <div className="text-[10px] font-medium text-primary">Branded</div>
                        {item.branding.map((b, idx) => (
                          <div key={idx} className="text-[10px] text-muted-foreground">
                            Position: {b.branding_position} • Size: {b.branding_size} • Type: {b.branding_type} • Colours: {b.color_count}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQty(String(item.stock_id), item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            updateQty(String(item.stock_id), Math.max(1, newQty));
                          }}
                          className="text-sm font-medium w-12 text-center border rounded px-2 py-1 h-8"
                          aria-label="Quantity"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQty(String(item.stock_id), item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(String(item.stock_id))}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quote Form */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Quote Request</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                />
              </div>

              <Separator />

              <h3 className="font-medium">Shipping Address</h3>
              
              <div>
                <label className="text-sm font-medium">Street Address *</label>
                <Input
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Suburb</label>
                  <Input
                    name="suburb"
                    value={formData.suburb}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City *</label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Province *</label>
                  <Input
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Postal Code *</label>
                  <Input
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Country *</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand hover:bg-brand-ink"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quote'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
