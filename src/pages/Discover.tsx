import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import arrowDown from '@/assets/arrow-down.png';
import { SEOHead } from '@/components/SEOHead';
import { EventsCarousel } from '@/components/EventsCarousel';
import { RotatingBadge } from '@/components/RotatingBadge';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  background_image_url: string;
  target_date: string;
  address: string;
}

const EventCard = ({
  event


}: {event: Event;}) => {
  const navigate = useNavigate();

  const isEventLive = () => {
    const now = new Date().getTime();
    const target = new Date(event.target_date).getTime();
    const oneHour = 1000 * 60 * 60;
    return now >= target && now <= target + oneHour;
  };

  const eventLive = isEventLive();

  return (
    <div
      className="relative cursor-pointer group"
      onClick={() => navigate(`/event/${event.id}`)}>
      
      <div className="overflow-hidden mb-3">
        <div
          className="aspect-square bg-gray-300 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
          style={{ backgroundImage: `url(${event.background_image_url})` }}>
        </div>
      </div>
      <div className="absolute top-4 left-4 flex flex-col gap-0">
        <div className="bg-white border border-black px-3 h-[23px] flex items-center">
          <div className="text-[11px] font-medium uppercase leading-none">{event.date}</div>
        </div>
        <div className="bg-white border border-t-0 border-black px-3 h-[23px] flex items-center">
          <div className="text-[11px] font-medium leading-none">{event.time}</div>
        </div>
        {eventLive &&
        <div className="bg-white border border-t-0 border-black px-3 h-[23px] flex items-center">
            <div className="text-[11px] font-medium uppercase leading-none">LIVE NOW</div>
          </div>
        }
      </div>
      <h3 className="text-lg font-medium">{event.title}</h3>
      <p className="text-sm text-gray-500 mt-1">{event.address}</p>
    </div>);

};
const Discover = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>('the world');
  const [initialDateSet, setInitialDateSet] = useState(false);

  useEffect(() => {
    fetchEvents();
    detectUserCountry();
  }, []);

  // Set initial date only if there are events today
  useEffect(() => {
    if (!initialDateSet && events.length > 0) {
      const today = new Date();
      const now = today.getTime();
      const oneHour = 1000 * 60 * 60;

      const hasEventsToday = events.some((event) => {
        const eventDate = new Date(event.target_date);
        const target = eventDate.getTime();
        const hasEnded = target < now - oneHour;

        if (hasEnded) return false;

        return (
          eventDate.getFullYear() === today.getFullYear() &&
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getDate() === today.getDate());

      });

      if (hasEventsToday) {
        setDate(today);
      }
      setInitialDateSet(true);
    }
  }, [events, initialDateSet]);

  const detectUserCountry = async () => {
    try {
      const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
      const data = await response.text();
      const locMatch = data.match(/loc=([A-Z]{2})/);

      if (locMatch && locMatch[1]) {
        const countryCode = locMatch[1];
        // Convert country code to full name
        const countryNames: {[key: string]: string;} = {
          'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
          'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
          'BE': 'Belgium', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
          'PL': 'Poland', 'CH': 'Switzerland', 'AT': 'Austria', 'IE': 'Ireland', 'PT': 'Portugal',
          'IN': 'India', 'JP': 'Japan', 'CN': 'China', 'KR': 'South Korea', 'BR': 'Brazil',
          'MX': 'Mexico', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'SG': 'Singapore',
          'NZ': 'New Zealand', 'ZA': 'South Africa', 'RU': 'Russia', 'TR': 'Turkey', 'GR': 'Greece'
        };
        setUserCountry(countryNames[countryCode] || countryCode);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error detecting country:', error);
      setUserCountry('the world');
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.
      from('events').
      select('id, title, date, time, background_image_url, target_date, address').
      order('target_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on selected date and hide ended events
  const filteredEvents = events.filter((event) => {
    // Check if event has ended (more than 1 hour past target_date)
    const now = new Date().getTime();
    const target = new Date(event.target_date).getTime();
    const oneHour = 1000 * 60 * 60;
    const hasEnded = target < now - oneHour;

    if (hasEnded) return false;

    if (!date) return true;

    const eventDate = new Date(event.target_date);
    const selectedDate = new Date(date);

    return (
      eventDate.getFullYear() === selectedDate.getFullYear() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getDate() === selectedDate.getDate());

  });
  const scrollToEvents = () => {
    const eventsSection = document.getElementById('events-section');
    eventsSection?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <div className="min-h-screen bg-white">
      <SEOHead
      title="Discover Events"
      description="Explore popular events near you, browse by category, or check out some of the great community calendars."
      keywords="events, discover events, community events, local events, event calendar" />
    
      <div className="animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <Navbar />
      </div>
      
    
      
      {/* Hero Section */}
      <section className="pt-32 md:pt-40 lg:pt-48 pb-6 md:pb-16 lg:pb-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-6 md:mb-10 inline-flex flex-col items-center" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="flex items-center">
              <span className="border border-black px-3 md:px-6 py-2 md:py-4 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>Analyze</span>
              <span className="bg-[#ff6bff] border border-black px-3 md:px-6 py-2 md:py-4 rounded-[20px] md:rounded-[40px] -ml-px animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>NPS</span>
            </div>
            <div className="flex items-center -mt-px">
              <span className="border border-black px-3 md:px-6 py-2 md:py-4 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>for your</span>
              <span className="border border-l-0 border-black px-3 md:px-6 py-2 md:py-4 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>product</span>
            </div>
          </h1>
          <p className="text-sm md:text-base lg:text-[18px] text-black max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
            Turn raw NPS feedback into deep insights that reveal what customers truly think
          </p>
        </div>
      </section>

      {/* Auto-scrolling Events Carousel */}
      <EventsCarousel />

      {/* Events Section */}
      <section id="events-section" className="px-4 md:px-8 pb-16 pt-6 md:pt-16">
        

























































      
      </section>
    </div>;
};
export default Discover;