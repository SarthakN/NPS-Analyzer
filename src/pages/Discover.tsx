import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { SEOHead } from '@/components/SEOHead';
import { NpsUpload } from '@/components/NpsUpload';

const Discover = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'results'>('upload');

  const handleAnalysisStart = () => {
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="NPS Analyzer — Deep Customer Insights"
        description="Turn raw NPS feedback into deep insights that reveal what customers truly think."
        keywords="NPS, net promoter score, customer feedback, analysis, insights"
      />

      <div className="animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <Navbar />
      </div>

      {/* Hero Section */}
      <section className="pt-32 md:pt-40 lg:pt-48 pb-6 md:pb-16 lg:pb-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-6 md:mb-10 inline-flex flex-col items-center" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="flex items-center">
              <span className="border border-foreground px-3 md:px-6 py-2 md:py-4 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>Analyze</span>
              <span className="bg-[hsl(300,100%,71%)] border border-foreground px-3 md:px-6 py-2 md:py-4 rounded-[20px] md:rounded-[40px] -ml-px animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>NPS</span>
            </div>
            <div className="flex items-center -mt-px">
              <span className="border border-foreground px-3 md:px-6 py-2 md:py-4 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>for your</span>
              <span className="border border-l-0 border-foreground px-3 md:px-6 py-2 md:py-4 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>product</span>
            </div>
          </h1>
          <p className="text-sm md:text-base lg:text-[18px] text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
            Turn raw NPS feedback into deep insights that reveal what customers truly think
          </p>
        </div>
      </section>

      {/* Upload / Results Section */}
      <section className="px-4 md:px-8 pb-24">
        <NpsUpload activeTab={activeTab} onActiveTabChange={setActiveTab} onAnalysisStart={handleAnalysisStart} />
      </section>
    </div>
  );
};

export default Discover;
