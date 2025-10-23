"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Hexagon, ChevronDown } from 'lucide-react';

export default function ContactPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    company: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    enquiryType: '',
    projectDetails: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Section - Content */}
          <div className="space-y-8">

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Get in Touch with Our Team
            </h1>

            {/* Intro Paragraph */}
            <p className="text-lg text-gray-700 leading-relaxed">
              At MerchLab, we support businesses of all sizes, from start-ups to scale-ups to large corporations, 
              by simplifying their merchandise processes. Our mission is to provide the tools and expertise needed 
              to create and manage branded merchandise that connects with your audience, strengthens your brand, 
              and supports your business goals.
            </p>

            {/* Service Sections */}
            <div className="space-y-8">
              {/* Full-Service Merchandising */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Hexagon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Full-Service Merchandising</h3>
                  <p className="text-gray-700">
                    We manage every aspect of your merchandising, from custom collections to bulk orders, 
                    ensuring that everything runs smoothly and efficiently, so you can focus on growing your business.
                  </p>
                </div>
              </div>

            </div>

            {/* Closing Statement */}
            <p className="text-lg text-gray-700">
              We&apos;d love to learn more about your business and how we can support you. Book a call or complete the form, 
              and we&apos;ll be in touch shortly.
            </p>
          </div>

          {/* Right Section - Form */}
          <div className="lg:max-w-md">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help?</h2>


                {currentStep === 1 ? (
                  <form onSubmit={handleNextStep} className="space-y-4">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                          First name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                          Last name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
                    >
                      Continue
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="enquiryType" className="block text-sm font-medium text-gray-700 mb-1">
                        Enquiry Type
                      </label>
                      <div className="relative">
                        <select
                          id="enquiryType"
                          name="enquiryType"
                          value={formData.enquiryType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          required
                        >
                          <option value="">Enquiry Type</option>
                          <option value="general">General Inquiry</option>
                          <option value="quote">Request Quote</option>
                          <option value="custom">Custom Design</option>
                          <option value="bulk">Bulk Order</option>
                          <option value="support">Customer Support</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="projectDetails" className="block text-sm font-medium text-gray-700 mb-1">
                        Some Details
                      </label>
                      <textarea
                        id="projectDetails"
                        name="projectDetails"
                        value={formData.projectDetails}
                        onChange={handleInputChange}
                        placeholder="How can we help?"
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-lg"
                    >
                      Submit
                    </Button>
                  </form>
                )}

                {/* Step Indicator */}
                <div className="flex justify-center space-x-2 mt-6">
                  <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
}
