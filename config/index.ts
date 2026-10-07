import type { AppInfo } from '@/types/app'
export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'a2ebb74c-a6b3-4f4a-a9f8-6b9f64e652fc'
export const APP_INFO: AppInfo = {
  title: 'Aurora AI',
  description: 'Asistente de Salón Aurora · Salon Aurora assistant',
  copyright: 'Aurora AI',
  privacy_policy: '/privacy',
  default_language: 'es',
  disable_session_same_site: false, // set it to true if you want to embed the chatbot in an iframe
}

export const isShowPrompt = false
export const promptTemplate = 'I want you to act as a javascript console.'

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48
