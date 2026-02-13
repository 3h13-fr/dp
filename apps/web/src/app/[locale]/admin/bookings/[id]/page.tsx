'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { PaymentPayoutTab } from '../components/tabs/PaymentPayoutTab';
import { InspectionsTab } from '../components/tabs/InspectionsTab';
import { CautionTab } from '../components/tabs/CautionTab';
import { DisputeTab } from '../components/tabs/DisputeTab';
import { TimelineTab } from '../components/tabs/TimelineTab';
import { ScoresTab } from '../components/tabs/ScoresTab';

type Tab = 'overview' | 'payment-payout' | 'inspections' | 'caution' | 'dispute' | 'timeline' | 'scores';

export default function AdminBookingDetailsPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(() => {
    if (!bookingId) return;
    apiFetch(`/admin/bookings/${bookingId}`)
      .then((res) => res.json())
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    fetchBooking();
  }, [bookingId, fetchBooking]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!booking) return <p className="text-muted-foreground">Booking not found</p>;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'payment-payout', label: 'Paiement & Payout' },
    { id: 'inspections', label: 'Inspections' },
    { id: 'caution', label: 'Caution' },
    { id: 'dispute', label: 'Litiges' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'scores', label: 'Scores' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Booking Details</h1>
        <p className="text-sm text-muted-foreground">ID: {bookingId}</p>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab booking={booking} />}
        {activeTab === 'payment-payout' && <PaymentPayoutTab bookingId={bookingId} />}
        {activeTab === 'inspections' && <InspectionsTab booking={booking} />}
        {activeTab === 'caution' && <CautionTab booking={booking} onRefresh={fetchBooking} />}
        {activeTab === 'dispute' && <DisputeTab booking={booking} onRefresh={fetchBooking} />}
        {activeTab === 'timeline' && <TimelineTab booking={booking} />}
        {activeTab === 'scores' && <ScoresTab booking={booking} />}
      </div>
    </div>
  );
}
