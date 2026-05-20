import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

// Try multiple candidate column names, fall back to first column value
function findCol(row, candidates) {
  for (const c of candidates) {
    if (c in row && row[c] != null) return String(row[c])
  }
  const vals = Object.values(row)
  return vals.length ? String(vals[0]) : '?'
}

const APP_COL  = ['ApplicationName', 'Application', 'AppName', 'App']
const GRP_COL  = ['GroupName', 'Group', 'Name', 'AzmanGroup']
const OP_COL   = ['OperationName', 'Operation', 'Name', 'AzmanOperation']

const TYPE_COLOR = {
  user:  '#6366f1',
  app:   '#f59e0b',
  group: '#10b981',
  op:    '#3b82f6',
}
const TYPE_R = { user: 22, app: 15, group: 10, op: 7 }

export default function UserGraph({ user, groups, operations }) {
  const svgRef      = useRef(null)
  const simRef      = useRef(null)
  const [showOps, setShowOps] = useState(true)

  useEffect(() => {
    if (!svgRef.current || !user) return

    // ── Stop previous simulation ──────────────────────────────────────────
    if (simRef.current) simRef.current.stop()

    const el     = svgRef.current
    const width  = el.clientWidth  || 800
    const height = el.clientHeight || 500
    const svg    = d3.select(el)
    svg.selectAll('*').remove()

    // ── Build nodes + links ───────────────────────────────────────────────
    const nodes = []
    const links = []
    const appMap = new Map()   // appName → node id

    const userId = `user:${user}`
    nodes.push({ id: userId, label: user, type: 'user', r: TYPE_R.user })

    const addApp = (appName) => {
      if (!appMap.has(appName)) {
        const id = `app:${appName}`
        appMap.set(appName, id)
        nodes.push({ id, label: appName, type: 'app', r: TYPE_R.app })
        links.push({ source: userId, target: id })
      }
      return appMap.get(appName)
    }

    groups.forEach((row, i) => {
      const app   = findCol(row, APP_COL)
      const grp   = findCol(row, GRP_COL)
      const appId = addApp(app)
      const id    = `grp:${app}:${grp}:${i}`
      nodes.push({ id, label: grp, type: 'group', r: TYPE_R.group })
      links.push({ source: appId, target: id })
    })

    if (showOps) {
      operations.forEach((row, i) => {
        const app   = findCol(row, APP_COL)
        const op    = findCol(row, OP_COL)
        const appId = addApp(app)
        const id    = `op:${app}:${op}:${i}`
        nodes.push({ id, label: op, type: 'op', r: TYPE_R.op })
        links.push({ source: appId, target: id })
      })
    }

    // ── Defs: arrowhead marker ────────────────────────────────────────────
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 8).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#94a3b8')

    // ── Simulation ────────────────────────────────────────────────────────
    const sim = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id((d) => d.id).distance((l) => {
        const t = l.target.type || 'group'
        return t === 'group' ? 90 : t === 'op' ? 60 : 130
      }))
      .force('charge',  d3.forceManyBody().strength(-220))
      .force('center',  d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide((d) => d.r + 10))

    simRef.current = sim

    // ── Links ─────────────────────────────────────────────────────────────
    const linkSel = svg.append('g').attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.2)
      .attr('stroke-opacity', 0.5)

    // ── Nodes ─────────────────────────────────────────────────────────────
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end',  (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null; d.fy = null
      })

    const nodeSel = svg.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(drag)

    // Shadow / glow for user node
    const defs = svg.select('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    nodeSel.append('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => TYPE_COLOR[d.type])
      .attr('fill-opacity', (d) => d.type === 'op' ? 0.7 : 0.9)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('filter', (d) => d.type === 'user' ? 'url(#glow)' : null)

    // Labels — show for user + app + group; ops only on hover
    nodeSel.filter((d) => d.type !== 'op')
      .append('text')
      .text((d) => d.label.length > 22 ? d.label.slice(0, 20) + '…' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.r + 13)
      .attr('font-size', (d) => d.type === 'user' ? 13 : d.type === 'app' ? 11 : 10)
      .attr('font-weight', (d) => d.type === 'user' ? 700 : 400)
      .attr('fill', 'var(--text-body)')
      .attr('pointer-events', 'none')

    // Tooltip for all nodes
    nodeSel.append('title').text((d) => d.label)

    // ── Tick ─────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      linkSel
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [user, groups, operations, showOps])

  return (
    <div className="user-graph-wrap">
      <div className="user-graph-toolbar">
        <div className="graph-legend">
          {[['user','User'],['app','Application'],['group','Group'],['op','Operation']].map(([t,l]) => (
            <span key={t} className="legend-item">
              <span className="legend-dot" style={{ background: TYPE_COLOR[t] }} />
              {l}
            </span>
          ))}
        </div>
        <label className="graph-toggle-ops">
          <input type="checkbox" checked={showOps} onChange={(e) => setShowOps(e.target.checked)} />
          Show operations
        </label>
      </div>
      <svg ref={svgRef} className="user-graph-svg" />
    </div>
  )
}
