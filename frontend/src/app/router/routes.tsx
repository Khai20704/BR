import { Navigate, type RouteObject } from 'react-router'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { WorkspaceGate } from '../auth/WorkspaceGate'
import { LoginPage } from '../auth/LoginPage'
import { HistoryPage } from '../history/HistoryPage'
import { SiteSetupPage } from '@/features/site/presentation/pages/SiteSetupPage'
import { SettingsPage } from './SettingsPage'
import { DryingFlowPage } from '../drying/DryingFlowPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <WorkspaceGate />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/shop', element: <SiteSetupPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/drying/new', element: <DryingFlowPage /> },
      { path: '/site', element: <Navigate to="/shop" replace /> },
      ...[
        '/batch',
        '/thermal-profile',
        '/simulation',
        '/ai-planning',
        '/replanning',
        '/benchmark',
      ].map((path) => ({
        path,
        element: <Navigate to="/drying/new" replace />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
