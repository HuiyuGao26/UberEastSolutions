// Node 22: node --experimental-strip-types --test test/challenge-photo.test.mjs
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { prepareChallengePhoto } from '../src/domain/challengePhoto.ts'
import { localRecords } from '../src/sap/repository.ts'

let values
beforeEach(() => {
  values = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  })
})

const challenge = {
  deductionId: '60000231', text: 'Both drinks were packed.', sentAt: '2026-10-16T12:00:00Z',
}
const photo = { name: 'packing.jpg', dataUrl: 'data:image/jpeg;base64,/9j/2Q==' }

test('rejects unsupported formats and files over 5 MB before decoding', async () => {
  await assert.rejects(prepareChallengePhoto(new File(['hello'], 'notes.txt', { type: 'text/plain' })), /JPEG or PNG/)
  await assert.rejects(prepareChallengePhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })), /5 MB/)
})

test('old text-only challenges and optional photos survive repository reloads', () => {
  localRecords('sample').saveChallenge(challenge)
  assert.deepEqual(localRecords('sample').listChallenges(), [challenge])
  localRecords('sample').saveChallenge({ ...challenge, photo })
  assert.deepEqual(localRecords('sample').listChallenges(), [{ ...challenge, photo }])
})

test('browser record namespaces stay separate; Reset clears saved evidence', () => {
  localRecords('sample').saveChallenge({ ...challenge, photo })
  assert.deepEqual(localRecords('sap').listChallenges(), [])
  localRecords('sample').clear()
  assert.deepEqual(localRecords('sample').listChallenges(), [])
})

test('storage failures are reported and leave the previous challenge intact', () => {
  const records = localRecords('sample')
  records.saveChallenge(challenge)
  localStorage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  assert.throws(() => records.saveChallenge({ ...challenge, photo }), /could not be saved/)
  assert.deepEqual(records.listChallenges(), [challenge])
})

test('unavailable browser storage does not falsely report a sent challenge', () => {
  localStorage.getItem = () => { throw new Error('Storage unavailable') }
  localStorage.setItem = () => { throw new Error('Storage unavailable') }
  const records = localRecords('sample')
  assert.deepEqual(records.listChallenges(), [])
  assert.throws(() => records.saveChallenge(challenge), /could not be saved/)
})
