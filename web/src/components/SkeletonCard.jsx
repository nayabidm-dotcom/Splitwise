import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="card">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="list-item" key={i} style={{ gap: 12 }}>
          <Skeleton circle width={38} height={38} />
          <div style={{ flex: 1 }}><Skeleton width="60%" height={14} /><Skeleton width="40%" height={12} style={{ marginTop: 6 }} /></div>
          <Skeleton width={70} height={16} />
        </div>
      ))}
    </div>
  );
}
export function SkeletonGroupCards({ count = 3 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div className="card" key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Skeleton circle width={38} height={38} />
          <div style={{ flex: 1 }}><Skeleton width="50%" height={14} /><Skeleton width="30%" height={12} style={{ marginTop: 6 }} /></div>
          <Skeleton width={80} height={16} />
        </div>
      ))}
    </div>
  );
}