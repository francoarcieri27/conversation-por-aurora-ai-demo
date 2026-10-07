import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { setLocaleOnClient } from '@/i18n/client'
import {
  Bars3Icon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid'
export interface IHeaderProps {
  title: string
  isMobile?: boolean
  onShowSideBar?: () => void
  onCreateNewChat?: () => void
}
const Header: FC<IHeaderProps> = ({
  title,
  isMobile,
  onShowSideBar,
  onCreateNewChat,
}) => {
  const { i18n } = useTranslation()
  return (
    <div className="shrink-0 flex items-center justify-between h-12 px-3 bg-gray-100">
      {isMobile
        ? (
          <button type='button' aria-label='Abrir conversaciones / Open conversations'
            className='flex items-center justify-center h-8 w-8 cursor-pointer'
            onClick={() => onShowSideBar?.()}
          >
            <Bars3Icon className="h-4 w-4 text-gray-500" />
          </button>
        )
        : <div></div>}
      <div className='flex items-center space-x-2'>
        <span aria-hidden="true" className="text-xl text-amber-700">✦</span>
        <div className=" text-sm text-gray-800 font-bold">{title}</div>
      </div>
      <div className='flex items-center gap-2'>
      <select aria-label='Idioma / Language' value={i18n.language === 'en' ? 'en' : 'es'} onChange={event => { setLocaleOnClient(event.target.value as 'es' | 'en', true); document.documentElement.lang = event.target.value }} className='rounded-md border border-gray-300 bg-white p-1 text-xs'>
        <option value='es'>Español</option><option value='en'>English</option>
      </select>
      {isMobile
        ? (
          <button type='button' aria-label='Nueva conversación / New conversation' className='flex items-center justify-center h-8 w-8 cursor-pointer' onClick={() => onCreateNewChat?.()} >
            <PencilSquareIcon className="h-4 w-4 text-gray-500" />
          </button>)
        : <div></div>}
      </div>
    </div>
  )
}

export default React.memo(Header)
