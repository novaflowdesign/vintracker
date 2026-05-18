import { FileText } from 'lucide-react'

export default function Opisy() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <FileText size={64} className="text-gray-200 dark:text-slate-700 mb-4" />
      <p className="text-lg font-semibold text-gray-400 dark:text-slate-500">Opisy — wkrótce</p>
      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 max-w-xs">
        Tu będzie generator opisów ogłoszeń na podstawie zdjęcia.
      </p>
    </div>
  )
}
