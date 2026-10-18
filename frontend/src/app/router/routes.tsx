import type { RouteObject } from 'react-router'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { WorkspaceGate } from '../auth/WorkspaceGate'
import { LoginPage } from '../auth/LoginPage'
import { HistoryPage } from '../history/HistoryPage'
import { SiteSetupPage } from '@/features/site/presentation/pages/SiteSetupPage'
import { BatchSetupPage } from '@/features/batch/presentation/pages/BatchSetupPage'
import { ThermalProfilePage } from '@/features/thermal-profile/presentation/pages/ThermalProfilePage'
import { SimulationPage } from '@/features/simulation/presentation/pages/SimulationPage'
import { PlanningPage } from '@/features/ai-planning/presentation/pages/PlanningPage'
import { ReplanningPage } from '@/features/replanning/presentation/pages/ReplanningPage'
import { BenchmarkPage } from '@/features/benchmark/presentation/pages/BenchmarkPage'
import {
  dataMode,
  previewServices as services,
  replanService,
  batchMassBalance,
} from '../preview-services'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <WorkspaceGate />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/history', element: <HistoryPage /> },
      {
        path: '/site',
        element: <SiteSetupPage loadSource={services.thermal} />,
      },
      {
        path: '/batch',
        element: <BatchSetupPage computeMassBalance={batchMassBalance} />,
      },
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
            replan={replanService}
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
