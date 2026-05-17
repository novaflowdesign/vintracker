import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'install-prompt-dismissed'
const DISMISSED_DAYS = 30

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const days = (Date.now() - new Date(dismissed).getTime()) / 86_400_000
      if (days < DISMISSED_DAYS) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !promptEvent) return null

  async function handleInstall() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
    setVisible(false)
  }

  return (
    <div className="md:hidden fixed bottom-20 inset-x-4 z-40 bg-slate-900 text-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Zainstaluj aplikację</p>
        <p className="text-xs text-slate-400 mt-0.5">na swoim urządzeniu</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
      >
        Zainstaluj
      </button>
      <button onClick={handleDismiss} className="shrink-0 text-slate-400 hover:text-white p-1" aria-label="Zamknij">
        <X size={16} />
      </button>
    </div>
  )
}
