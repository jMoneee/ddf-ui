/* Copyright (c) Connexta, LLC */
import { SnackProps } from './snack.provider'

const ONE_SECOND = 1000

export const CLOSEABLE_ERROR = {
  status: 'error',
  closeable: true,
  timeout: 10 * ONE_SECOND,
} as SnackProps

export const CLOSEABLE_INFO = {
  status: 'info',
  closeable: true,
  timeout: 3 * ONE_SECOND,
} as SnackProps

export const CLOSEABLE_WARNING = {
  status: 'warning',
  closeable: true,
  timeout: 10 * ONE_SECOND,
} as SnackProps

export const SUCCESSFUL_ACTION = {
  status: 'success',
  closeable: true,
  timeout: 5 * ONE_SECOND,
} as SnackProps
