import { useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
export default function AnimatedAmount({ value, currency = 'INR', className = '' }) {
  const mv = useMotionValue(0);
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: 'easeOut', onUpdate: (v) => setDisplayed(v) });
    return () => controls.stop();
  }, [value, mv]);
  const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.round(displayed) / 100);
  return <motion.span className={className} initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>{formatted}</motion.span>;
}