import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle2, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { Conversation, Visitor } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  visitor: Visitor | null;
  onConfirmBooking: (slot: string, details: { firstName: string; email: string; phone?: string }) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  conversation,
  visitor,
  onConfirmBooking
}) => {
  const [selectedSlot, setSelectedSlot] = useState('Thursday, 11:00 AM (BST)');
  const [firstName, setFirstName] = useState(visitor?.first_name || '');
  const [email, setEmail] = useState(visitor?.email || '');
  const [phone, setPhone] = useState(visitor?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const slots = [
    'Thursday, 11:00 AM (BST)',
    'Thursday, 2:30 PM (BST)',
    'Friday, 10:00 AM (BST)',
    'Friday, 3:00 PM (BST)',
    'Next Monday, 11:30 AM (BST)',
    'Next Tuesday, 4:00 PM (BST)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await onConfirmBooking(selectedSlot, {
        firstName: firstName || 'Prospect',
        email,
        phone
      });
      setIsSuccess(true);
    } catch (err) {
      console.error('Booking failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="booking-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div id="booking-modal-card" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Book Chartered Financial Consultation</h3>
              <p className="text-[11px] text-slate-400">20-minute video discovery call with context handover</p>
            </div>
          </div>
          <button
            id="close-booking-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Consultation Confirmed!</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              We have booked your appointment for <strong>{selectedSlot}</strong>. A calendar invite and pre-meeting briefing have been prepared with your goal summary.
            </p>
            <button
              id="finish-booking-btn"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Return to Conversation
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-800">
            {/* Adviser Info Banner */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 text-xs">Marcus Sterling, CFP®</div>
                <div className="text-[11px] text-slate-500">Senior Chartered Financial Planner</div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  <ShieldCheck className="w-3 h-3" /> No Obligation
                </span>
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select a convenient time
              </label>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((s) => {
                  const isSelected = selectedSlot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      id={`slot-btn-${s.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setSelectedSlot(s)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-medium transition ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 mb-1 text-slate-400" />
                      <div>{s}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  id="booking-name-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="booking-email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="booking-phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7700 900000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                id="booking-cancel-btn"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="booking-confirm-btn"
                disabled={isSubmitting || !email}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Consultation'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
