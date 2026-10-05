import { Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
export default function PayNowButton({ toUser, amountCents, onPaid }) {
  const hasUpi = toUser?.upi_id && toUser.upi_id.includes('@');
  function pay() {
    if (!hasUpi) { toast.error(`${toUser?.name} hasn't set a UPI ID`); return; }
    const vpa = toUser.upi_id;
    const pn = encodeURIComponent(toUser.name);
    const am = (amountCents / 100).toFixed(2);
    const tn = encodeURIComponent('Splitwise settlement');
    const link = `upi://pay?pa=${vpa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
    toast.loading('Opening UPI app…', { id: 'upi' });
    setTimeout(() => {
      toast.dismiss('upi');
      window.location.href = link;
      if (onPaid) onPaid();
    }, 300);
  }
  return (
    <button className="btn btn-sm btn-primary" onClick={pay} disabled={!hasUpi} title={hasUpi ? `Pay to ${toUser.upi_id}` : 'No UPI ID set'}>
      <Smartphone size={13} /> Pay
    </button>
  );
}