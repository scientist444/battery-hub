'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className="max-w-xs rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/15"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">Battery HUB Support</p>
                <p className="text-xs font-semibold text-emerald-600">Islamabad &amp; Rawalpindi</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTooltip(false)}
                className="text-slate-400 transition hover:text-slate-700"
                aria-label="Close WhatsApp tooltip"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-sm leading-6 text-slate-600">
              Need help selecting a battery, charger, adapter, or power supply? Message us with your
              voltage, current, and connector details.
            </p>
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I need help selecting a battery or power product.')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Start Chat
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setShowTooltip((show) => !show)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 transition hover:bg-emerald-700"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </motion.button>
    </div>
  );
}
