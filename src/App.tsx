import { MerchantApp } from '@/apps/merchant/MerchantApp'
import { TopBar } from '@/components/shared/TopBar'
import { DemoSimulation } from '@/components/shared/DemoSimulation'
import { Toaster } from '@/components/ui/sonner'
import { AppProvider } from '@/state/store'

export default function App() {
  return (
    <AppProvider>
      <div className="flex h-screen flex-col bg-muted/50">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <MerchantApp />
          <DemoSimulation />
        </main>
      </div>
      <Toaster position="bottom-left" />
    </AppProvider>
  )
}
