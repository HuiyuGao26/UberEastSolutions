import { CustomerApp } from '@/apps/customer/CustomerApp'
import { MerchantApp } from '@/apps/merchant/MerchantApp'
import { SupportApp } from '@/apps/support/SupportApp'
import { DemoGuide } from '@/components/shared/DemoGuide'
import { TopBar } from '@/components/shared/TopBar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DemoProvider, useDemo } from '@/state/store'

function Shell() {
  const s = useDemo()
  return (
    <div className="flex h-screen flex-col bg-muted/50">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto p-6">
          {s.ui.role === 'merchant' && <MerchantApp />}
          {s.ui.role === 'customer' && <CustomerApp />}
          {s.ui.role === 'support' && <SupportApp />}
        </main>
        {s.ui.guideOpen && (
          <aside className="absolute inset-y-0 right-0 z-20 w-80 border-l bg-background shadow-xl lg:static lg:shadow-none">
            <DemoGuide />
          </aside>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <DemoProvider>
      <TooltipProvider>
        <Shell />
        <Toaster position="bottom-left" />
      </TooltipProvider>
    </DemoProvider>
  )
}
