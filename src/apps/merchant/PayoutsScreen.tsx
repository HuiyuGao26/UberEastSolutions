import { useEffect, useRef, useState } from 'react'
import { ClipboardList, RefreshCw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import sampleCustomerPhoto from '@/assets/only-one-drink.png?inline'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { day, dayAndTime, money, signedMoney } from '@/domain/format'
import { CHALLENGE_WINDOW_DAYS, OUTCOME_DUE_DAYS, acceptanceFor, canChallenge, challengeDeadline, outcomeDue } from '@/domain/rules'
import { prepareChallengePhoto } from '@/domain/challengePhoto'
import type { ChallengePhoto, Deduction } from '@/domain/types'
import { useApp } from '@/state/store'

/**
 * Release 2 of Gao's proposal: a deduction appears on the day it is made,
 * with the reason and a way to challenge it.
 */
export function PayoutsScreen() {
  const { deductions, source, reload } = useApp()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Payouts</h2>
        <p className="text-sm text-muted-foreground">
          If a customer is refunded because of something on your side, the deduction appears here the same day, with the reason and a way to
          challenge it.
        </p>
        {source === 'sap' && (
          <p className="mt-1 text-xs text-muted-foreground">
            Read live from the SAP sandbox. These are SAP’s own demo credit memo requests; one older than 30 days can no longer be challenged.
          </p>
        )}
      </div>

      {deductions.status === 'loading' && (
        <div className="space-y-3" role="status" aria-label="Loading deductions">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <p className="text-sm text-muted-foreground">
            {source === 'sap' ? 'Reading credit memo requests from the SAP sandbox…' : 'Loading deductions…'}
          </p>
        </div>
      )}

      {deductions.status === 'error' && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>The deductions could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{deductions.message}</p>
            <Button className="mt-2" size="sm" variant="outline" onClick={reload}>
              <RefreshCw /> Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {deductions.status === 'ready' && deductions.value.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No deductions. Nothing has been taken from your payouts.
        </p>
      )}

      {deductions.status === 'ready' && (
        <div className="space-y-3">
          {deductions.value.map((d) => (
            <DeductionCard key={`${source}:${d.id}`} deduction={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeductionCard({ deduction: d }: { deduction: Deduction }) {
  const { source, decisions, challenges, challenge } = useApp()
  const hasCustomerPhoto = source === 'sample' && d.reference.kind === 'order' && d.reference.id === '4821'
  // The payout can only be shown for an order the merchant accepted in this app.
  const decision = acceptanceFor(d, decisions)
  const sent = challenges.find((c) => c.deductionId === d.id)
  const open = canChallenge(d, decision?.order)
  const [writing, setWriting] = useState(false)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<ChallengePhoto>()
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const photoRequest = useRef(0)
  useEffect(() => () => { photoRequest.current += 1 }, [])
  const cur = d.currency

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {signedMoney(-d.amount, cur)} · {d.reference.kind} {d.reference.id}
          {sent ? (
            <Badge variant="secondary">Challenge sent</Badge>
          ) : open ? (
            <Badge variant="destructive">You can challenge this</Badge>
          ) : (
            <Badge variant="outline">Challenge window closed</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Deducted {dayAndTime(d.createdAt)} · refund {d.id}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="font-medium">{d.reason}</span>
          {d.lines.length > 0 && <>: {d.lines.map((line) => `${line.qty} × ${line.name}`).join(', ')}</>}
        </p>

        {hasCustomerPhoto && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Customer photo</p>
            <PhotoPreview photo={{ name: 'only-one-drink.png', dataUrl: sampleCustomerPhoto }} customer />
          </div>
        )}

        <div className="rounded-md bg-muted/60 p-3">
          <div className="flex justify-between gap-3">
            <span>Refund to the customer, taken from your payout</span>
            <span className="font-mono">{signedMoney(-d.amount, cur)}</span>
          </div>
          {decision && (
            <>
              <div className="flex justify-between gap-3 text-muted-foreground">
                <span>Uber Eats fee on this order: kept in full</span>
                <span className="font-mono">{money(decision.shown.fee, cur)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between gap-3 font-medium">
                <span>Payout for this order</span>
                <span className="font-mono">
                  {money(decision.shown.net, cur)} → {money(decision.shown.net - d.amount, cur)}
                </span>
              </div>
            </>
          )}
        </div>

        {open && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {decision && (
              <span>
                Challenge by: {day(challengeDeadline(decision.order))} ({CHALLENGE_WINDOW_DAYS} days from the order date)
              </span>
            )}
            <span>
              Outcome due by: {day(outcomeDue(d))} (day {OUTCOME_DUE_DAYS})
            </span>
          </div>
        )}

        {sent && (
          <div className="space-y-2 rounded-md border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs">
            <p><b>Your challenge, sent {dayAndTime(sent.sentAt)}:</b> {sent.text}</p>
            {sent.photo && <PhotoPreview photo={sent.photo} />}
          </div>
        )}

        {open && !sent && writing && (
          <div className="space-y-2">
            <Label htmlFor={`challenge-${d.id}`}>Why should this deduction be reversed?</Label>
            <Textarea
              id={`challenge-${d.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              autoFocus
              placeholder="For example: both sodas were packed; our packing photo shows them in the sealed bag."
            />
            <Label htmlFor={`photo-${d.id}`}>Attach photo (optional)</Label>
            <p id={`photo-help-${d.id}`} className="text-xs text-muted-foreground">
              One JPEG or PNG, up to 5 MB. Photos are resized and saved only in this browser for this demo; they are not sent to SAP.
            </p>
            <Input
              id={`photo-${d.id}`}
              type="file"
              accept="image/jpeg,image/png"
              disabled={readingPhoto}
              aria-describedby={`photo-help-${d.id}${photoError ? ` photo-error-${d.id}` : ''}`}
              aria-invalid={!!photoError}
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (!file) return
                const request = ++photoRequest.current
                setReadingPhoto(true)
                setPhotoError('')
                setSubmitError('')
                try {
                  const prepared = await prepareChallengePhoto(file)
                  if (request === photoRequest.current) setPhoto(prepared)
                } catch (error) {
                  if (request === photoRequest.current) {
                    setPhotoError(error instanceof Error ? error.message : 'This photo could not be opened.')
                  }
                } finally {
                  if (request === photoRequest.current) setReadingPhoto(false)
                }
              }}
            />
            {readingPhoto && <p role="status" className="text-xs text-muted-foreground">Preparing photo…</p>}
            {photoError && <p id={`photo-error-${d.id}`} role="alert" className="text-xs text-destructive">{photoError}</p>}
            {photo ? (
              <div className="space-y-2">
                <PhotoPreview photo={photo} />
                <Button variant="outline" size="sm" onClick={() => {
                  photoRequest.current += 1
                  setReadingPhoto(false)
                  setPhoto(undefined)
                  setPhotoError('')
                  setSubmitError('')
                }}>Remove photo</Button>
              </div>
            ) : <p className="text-xs text-muted-foreground">No photo attached.</p>}
            {submitError && <p role="alert" className="text-xs text-destructive">{submitError}</p>}
          </div>
        )}
      </CardContent>

      {open && !sent && (
        <CardFooter className="justify-end gap-2">
          {writing ? (
            <>
              <Button variant="ghost" disabled={readingPhoto} onClick={() => setWriting(false)}>
                Cancel
              </Button>
              <Button
                disabled={!text.trim() || readingPhoto}
                onClick={() => {
                  try {
                    challenge(d.id, text.trim(), photo)
                    setPhoto(undefined)
                    setSubmitError('')
                    toast.success(`Challenge sent. Outcome due by ${day(outcomeDue(d))}.`)
                  } catch (error) {
                    setSubmitError(error instanceof Error ? error.message : 'Your challenge could not be saved. Please try again.')
                  }
                }}
              >
                Send challenge
              </Button>
            </>
          ) : (
            <Button onClick={() => setWriting(true)}>
              <ClipboardList /> Challenge this deduction
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

function PhotoPreview({ photo, customer = false }: { photo: ChallengePhoto; customer?: boolean }) {
  const title = customer ? 'Customer photo' : 'Attached photo'
  const alt = customer ? 'Sample customer photo showing one Feijoa soda bottle' : 'Merchant evidence photo'
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="block max-w-full rounded-md border p-1 text-left focus-visible:ring-2 focus-visible:ring-ring" aria-label={customer ? 'View customer sample photo' : 'View attached photo'}>
          <img src={photo.dataUrl} alt={alt} className="h-24 w-32 rounded object-contain" />
          <span className="block max-w-48 truncate px-1 text-xs">{photo.name}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="break-all">{photo.name}</DialogDescription>
        <img src={photo.dataUrl} alt={`${alt} enlarged`} className="max-h-[65vh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  )
}
