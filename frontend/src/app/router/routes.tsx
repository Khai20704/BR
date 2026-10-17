import type { RouteObject } from 'react-router'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { AppLayout } from './AppLayout'
import { SiteSetupPage } from '@/features/site/presentation/pages/SiteSetupPage'
import { BatchSetupPage } from '@/features/batch/presentation/pages/BatchSetupPage'
import { ThermalProfilePage } from '@/features/thermal-profile/presentation/pages/ThermalProfilePage'
import { SimulationPage } from '@/features/simulation/presentation/pages/SimulationPage'
import { PlanningPage } from '@/features/ai-planning/presentation/pages/PlanningPage'
import { ReplanningPage } from '@/features/replanning/presentation/pages/ReplanningPage'
import { BenchmarkPage } from '@/features/benchmark/presentation/pages/BenchmarkPage'
import { dataMode, previewServices as services } from '../preview-services'
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/site', element: <SiteSetupPage /> },
      { path: '/batch', element: <BatchSetupPage /> },
      {
        path: '/thermal-profile',
        element: <ThermalProfilePage load={services.thermal} />,
      },
      {
        path: '/simulation',
        element: <SimulationPage load={services.simulation} />,
      },
      {
        path: '/ai-planning',
        element: <PlanningPage load={services.planning} />,
      },
      {
        path: '/replanning',
        element: (
          <ReplanningPage
            load={services.replanning}
            preview={dataMode === 'fixture'}
          />
        ),
      },
      {
        path: '/benchmark',
        element: <BenchmarkPage load={services.benchmark} />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
