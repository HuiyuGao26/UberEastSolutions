import type { Order } from './types'

const currencyFormats = new Map<string, Intl.NumberFormat>()

/** NZD prints as "$12.50"; other currencies keep their code, e.g. "US$12.50". */
export function money(value: number, currency: string): string {
  let format = currencyFormats.get(currency)
  if (!format) {
    format = new Intl.NumberFormat('en-NZ', { style: 'currency', currency })
    currencyFormats.set(currency, format)
  }
  return format.format(value)
}

export function signedMoney(value: number, currency: string): string {
  return value < 0 ? `−${money(-value, currency)}` : money(value, currency)
}

const dayFormat = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' })

function day(value: string | Date): string {
  return dayFormat.format(new Date(value))
}

function time(value: string | Date): string {
  return timeFormat.format(new Date(value))
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "today at 6:22 pm", or the date when it is another day. */
export function dayAndTime(value: string | Date): string {
  const date = new Date(value)
  return `${sameDay(date, new Date()) ? 'today' : day(date)} at ${time(date)}`
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function itemCount(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.qty, 0)
}
