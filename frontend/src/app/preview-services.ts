import { resolveDataMode } from '@/core/config/data-mode'
import {
  createLoadPreview as load0,
  createHttpPreviewRepository as http0,
} from '@/features/thermal-profile'
import {
  createLoadPreview as load1,
  createHttpPreviewRepository as http1,
} from '@/features/simulation'
import {
  createLoadPreview as load2,
  createHttpPreviewRepository as http2,
} from '@/features/ai-planning'
import {
  createLoadPreview as load3,
  createHttpPreviewRepository as http3,
} from '@/features/replanning'
import {
  createLoadPreview as load4,
  createHttpPreviewRepository as http4,
} from '@/features/benchmark'
export const dataMode = resolveDataMode(
  import.meta.env.VITE_DATA_MODE,
  import.meta.env.DEV,
)
const service0 = async () => {
  const repository =
    dataMode === 'fixture' && import.meta.env.DEV
      ? (
          await import('@/features/thermal-profile/infrastructure/repositories/FixturePreviewRepository')
        ).createFixturePreviewRepository()
      : http0()
  return load0(repository)()
}
const service1 = async () => {
  const repository =
    dataMode === 'fixture' && import.meta.env.DEV
      ? (
          await import('@/features/simulation/infrastructure/repositories/FixturePreviewRepository')
        ).createFixturePreviewRepository()
      : http1()
  return load1(repository)()
}
const service2 = async () => {
  const repository =
    dataMode === 'fixture' && import.meta.env.DEV
      ? (
          await import('@/features/ai-planning/infrastructure/repositories/FixturePreviewRepository')
        ).createFixturePreviewRepository()
      : http2()
  return load2(repository)()
}
const service3 = async () => {
  const repository =
    dataMode === 'fixture' && import.meta.env.DEV
      ? (
          await import('@/features/replanning/infrastructure/repositories/FixturePreviewRepository')
        ).createFixturePreviewRepository()
      : http3()
  return load3(repository)()
}
const service4 = async () => {
  const repository =
    dataMode === 'fixture' && import.meta.env.DEV
      ? (
          await import('@/features/benchmark/infrastructure/repositories/FixturePreviewRepository')
        ).createFixturePreviewRepository()
      : http4()
  return load4(repository)()
}
export const previewServices = {
  thermal: service0,
  simulation: service1,
  planning: service2,
  replanning: service3,
  benchmark: service4,
}
