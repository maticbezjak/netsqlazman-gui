function Sk({ w, h = 13, radius }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius }} />
}

export function SkeletonTable({ rows = 5 }) {
  const cols = [
    ['55%', '20%', '40%'],
    ['40%', '25%', '55%'],
    ['65%', '18%', '35%'],
    ['45%', '22%', '50%'],
    ['70%', '20%', '30%'],
  ]
  return (
    <div className="tab-content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 24, padding: '10px 0', borderBottom: '1px solid #f5f6f8' }}>
          {cols[i % 5].map((w, j) => <Sk key={j} w={w} />)}
        </div>
      ))}
    </div>
  )
}

export function SkeletonPanel() {
  return (
    <div className="panel-content">
      <div className="panel-toolbar">
        <Sk w={190} h={20} radius={6} />
        <Sk w={52}  h={20} radius={10} />
      </div>
      <SkeletonTable />
    </div>
  )
}

export function SkeletonInline() {
  return (
    <div className="tab-loading">
      {[['65%'], ['45%'], ['70%'], ['50%']].map(([w], i) => <Sk key={i} w={w} />)}
    </div>
  )
}
