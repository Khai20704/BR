import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  FlaskConical,
  Leaf,
  Thermometer,
  Waves,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router'
import { previewServices, dataMode } from '../preview-services'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { PreviewChart } from '@/shared/components/PreviewChart'
import {
  Badge,
  EmptyState,
  Notice,
  Panel,
  PreviewLabel,
  RequestState,
  Stat,
  Status,
  TextLink,
} from '@/shared/components/ui'
export function HomePage() {
  const q = usePreviewQuery('thermal', previewServices.thermal)
  const preview = dataMode === 'fixture'
  return (
    <>
      <div className="page-heading overview-heading">
        <div>
          <div className="eyebrow">
            <span className="green-dot" />
            THERMAL INTELLIGENCE WORKSPACE
          </div>
          <h1>Br — AI Thermal Engineer</h1>
          <p>Turn overlooked heat into a resource worth using.</p>
        </div>
        <Link className="button primary" to="/batch">
          <Boxes size={16} /> Configure a batch
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="hero-strip">
        <div className="hero-copy">
          <Badge tone="green">
            <Leaf size={12} />
            BREAK THE RULES
          </Badge>
          <h2>
            Waste heat.
            <br />
            <span>New possibilities.</span>
          </h2>
          <p>
            A connected workspace for understanding heat,
            <br className="desktop-only" /> exploring drying scenarios, and
            making better decisions.
          </p>
          <Link to="/site" className="hero-link">
            Set up your thermal source <ArrowRight size={16} />
          </Link>
        </div>
        <div className="thermal-art" aria-hidden="true">
          <div className="orbit orbit-1" />
          <div className="orbit orbit-2" />
          <div className="orbit orbit-3" />
          <div className="art-core">
            <Waves size={39} />
          </div>
          <span className="art-label label-source">LOW-GRADE HEAT</span>
          <span className="art-label label-material">MATERIAL POTENTIAL</span>
          <span className="art-coordinate">Br / THERMAL SYSTEMS</span>
          <div className="art-node n1" />
          <div className="art-node n2" />
        </div>
      </div>
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <div className="stats-grid">
        <Stat
          label="Thermal source"
          value={q.data ? '34–48' : '—'}
          unit="°C"
          detail={
            q.data
              ? 'SYNTHETIC · source temperature'
              : 'Awaiting source measurements'
          }
          icon={<Thermometer />}
        />
        <Stat
          label="Available heat"
          value={q.data ? '1.2–3.1' : '—'}
          unit="kW"
          detail={
            q.data
              ? 'SYNTHETIC · illustrative range'
              : 'No heat profile connected'
          }
          icon={<Zap />}
        />
        <Stat
          label="Active batches"
          value="—"
          detail="No production batches connected"
          icon={<Boxes />}
        />
        <Stat
          label="Simulation status"
          value="Not run"
          detail="Physics engine not connected"
          icon={<FlaskConical />}
        />
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Thermal availability"
          subtitle="Source profile · illustrative operating window"
          action={
            <Link to="/thermal-profile" aria-label="Open thermal profile">
              <ArrowUpRight size={18} />
            </Link>
          }
        >
          {q.data ? (
            <PreviewChart
              points={q.data.points.map((p) => ({
                time: p.time,
                value: p.temperature,
              }))}
              label="Source temperature"
              unit="°C"
            />
          ) : (
            <EmptyState />
          )}
          <div className="chart-footer">
            <span>
              <i className="legend-dot" />
              AC condenser waste heat
            </span>
            <span>Uncertainty not quantified</span>
          </div>
        </Panel>
        <Panel
          title="Workspace readiness"
          subtitle="A clear path from inputs to insight"
        >
          <div className="readiness-number">
            01<span>/ 04</span>
            <Badge>GETTING STARTED</Badge>
          </div>
          <div className="readiness-track">
            <span />
          </div>
          <div className="readiness-list">
            <Link to="/site">
              <span className="step-circle active">1</span>
              <div>
                <strong>Define your source</strong>
                <small>Site & equipment metadata</small>
              </div>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/batch">
              <span className="step-circle">2</span>
              <div>
                <strong>Characterize a batch</strong>
                <small>Mass, moisture & constraints</small>
              </div>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/simulation">
              <span className="step-circle">3</span>
              <div>
                <strong>Explore the digital twin</strong>
                <small>Awaiting a validated model</small>
              </div>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/ai-planning">
              <span className="step-circle">4</span>
              <div>
                <strong>Review a drying plan</strong>
                <small>No plan generated</small>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </Panel>
      </div>
      <div className="dashboard-bottom section-gap">
        <Panel
          title="Batch workspace"
          subtitle="Your next drying scenario starts here"
          action={
            <Link to="/batch">
              <TextLink>Configure</TextLink>
            </Link>
          }
        >
          <div className="batch-summary">
            <div className="material-icon">
              <Boxes size={27} />
            </div>
            <div>
              <h3>Spent coffee grounds</h3>
              <p>Material workspace · no saved batch</p>
            </div>
            <Badge>DRAFT</Badge>
          </div>
          <div className="batch-facts">
            <div>
              <span>Pressed mass</span>
              <strong>
                — <small>kg</small>
              </strong>
            </div>
            <div>
              <span>Initial moisture</span>
              <strong>
                — <small>% wb</small>
              </strong>
            </div>
            <div>
              <span>Target moisture</span>
              <strong>
                — <small>% wb</small>
              </strong>
            </div>
          </div>
          <Notice>
            Configure inputs to prepare a scenario. No drying outcome has been
            calculated.
          </Notice>
        </Panel>
        <Panel
          title="Recent activity"
          subtitle="Workspace status · not a production event log"
          action={<Clock3 size={17} />}
        >
          <div className="activity">
            <span className="activity-dot" />
            <div>
              <h3>
                {preview ? 'UI preview workspace opened' : 'Workspace opened'}
              </h3>
              <p>
                {preview
                  ? 'Synthetic chart fixtures available'
                  : 'Backend integration pending'}
              </p>
              <small>THIS SESSION</small>
            </div>
          </div>
          <div className="activity">
            <span className="activity-dot muted-dot" />
            <div>
              <h3>No engineering runs recorded</h3>
              <p>Simulation, planning & validation are not connected.</p>
              <Status value="NOT_VALIDATED" />
            </div>
          </div>
          {preview && <PreviewLabel />}
        </Panel>
      </div>
    </>
  )
}
