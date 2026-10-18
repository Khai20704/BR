import { ArrowRight, Coffee, Store, History } from 'lucide-react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { Panel } from '@/shared/components/ui'

export function HomePage() {
  const { site, repository } = useScenario()
  const recent = useQuery({
    queryKey: ['history', 'home-recent-plans'],
    queryFn: () => repository!.list('ai_plans'),
    enabled: !!repository,
    staleTime: 0,
  })
  const latest = recent.data?.rows[0]
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BREAK THE RULES</div>
          <h1>Home</h1>
          <p>A fresh possibility for your used coffee grounds.</p>
        </div>
      </div>
      <section className="home-welcome" aria-labelledby="welcome-title">
        <div>
          <span className="eyebrow">A LITTLE HEAT. A NEW START.</span>
          <h2 id="welcome-title">
            Your AC's leftover heat.
            <br />
            <span>Your next drying plan.</span>
          </h2>
          <p>
            Br helps you explore drying used coffee grounds with heat from your
            air conditioner. Tell us about your batch and get an understandable
            plan to review.
          </p>
          <Link className="button primary" to="/drying/new">
            <Coffee size={18} />
            Create a Drying Batch
            <ArrowRight size={18} />
          </Link>
          <small>
            Start with clearly marked examples, then adjust them for your shop.
          </small>
        </div>
        <div className="home-symbol" aria-hidden="true">
          <Coffee size={76} strokeWidth={1.2} />
          <span>
            Good grounds.
            <br />
            New possibilities.
          </span>
        </div>
      </section>
      <div className="equal-columns section-gap home-shortcuts">
        <Panel title="Your shop" action={<Store size={20} />}>
          {site ? (
            <>
              <h3>{site.name}</h3>
              <p className="body-copy">{site.location}</p>
              <p>
                {site.acModel} ? {site.capacity} kW rated cooling capacity
              </p>
            </>
          ) : (
            <p className="body-copy">
              Make yourself at home. Save your shop and AC information to reuse
              it for future batches.
            </p>
          )}
          <Link to="/shop" className="text-link">
            {site ? 'Manage My Shop' : 'Set up My Shop'}
            <ArrowRight size={16} />
          </Link>
        </Panel>
        <Panel
          title="Pick up where you left off"
          action={<History size={20} />}
        >
          {recent.isPending && repository && (
            <p role="status">Looking for your recent plans...</p>
          )}
          {recent.error ? (
            <p role="alert">
              Your history could not be loaded.{' '}
              <button
                className="text-link"
                onClick={() => void recent.refetch()}
              >
                Retry
              </button>
            </p>
          ) : latest ? (
            <>
              <h3>Your latest drying plan</h3>
              <p className="body-copy">
                {latest.createdAt?.toDate().toLocaleString() ??
                  'Recently saved'}{' '}
                ? Saved for you to review.
              </p>
              <Link
                className="text-link"
                to={
                  '/history?kind=ai_plans&record=' +
                  encodeURIComponent(latest.id)
                }
              >
                Open latest plan
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            !recent.isPending && (
              <p className="body-copy">
                Your first drying plan starts with a batch. Saved plans will be
                waiting here when you return.
              </p>
            )
          )}
          <p>
            <Link to="/history" className="text-link">
              View Drying History
              <ArrowRight size={16} />
            </Link>
          </p>
        </Panel>
      </div>
    </>
  )
}
