import axios from 'axios'
import { GENERAL_BASE_URL, getApiClient } from '../client'
import {
  getAggregatedStats as mailtrapGetAggregatedStats,
  getDailyStats as mailtrapGetDailyStats,
  getSendingDomains,
} from '../stats'
import type {
  VendorConnector,
  AggregatedStats,
  DailyStats,
  EmailEvent,
  SuppressionEntry,
  Account,
} from '../types'

/**
 * Mailtrap connector — thin adapter wrapping existing sandbox.ts and stats.ts.
 * The Mailtrap API client singleton is used for stats; token validation uses
 * a temporary client to avoid destroying the active session.
 */
export const mailtrapConnector: VendorConnector = {
  async validateToken(token: string): Promise<{ accountId: string; accountName: string }> {
    const tempClient = axios.create({
      baseURL: GENERAL_BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    })
    const { data: accounts } = await tempClient.get<Account[]>('/api/accounts')
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found for this API token')
    }
    return {
      accountId: String(accounts[0].id),
      accountName: accounts[0].name,
    }
  },

  async getDomains(token: string): Promise<{ id: string; name: string }[]> {
    // Mailtrap connector relies on the initialized global client via getApiClient().
    // The token param is unused because the global client has the token already.
    // We need the accountId, which we get from the global client.
    try {
      const client = getApiClient()
      const { data: accounts } = await client.get<Account[]>('/api/accounts')
      if (!accounts || accounts.length === 0) return []
      const domains = await getSendingDomains(accounts[0].id)
      return domains.map(d => ({ id: String(d.id), name: d.domain_name }))
    } catch {
      return []
    }
  },

  async getAggregatedStats(
    _token: string,
    startDate: string,
    endDate: string,
    domainId: string | null
  ): Promise<AggregatedStats> {
    // Delegates to existing Mailtrap stats module which uses the global API client.
    // We need the accountId from the global client.
    const client = getApiClient()
    const { data: accounts } = await client.get<Account[]>('/api/accounts')
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found')
    }
    const domainIds = domainId ? [parseInt(domainId, 10)] : undefined
    return mailtrapGetAggregatedStats(accounts[0].id, startDate, endDate, domainIds)
  },

  async getDailyStats(
    _token: string,
    startDate: string,
    endDate: string,
    domainId: string | null
  ): Promise<DailyStats[]> {
    const client = getApiClient()
    const { data: accounts } = await client.get<Account[]>('/api/accounts')
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found')
    }
    const domainIds = domainId ? [parseInt(domainId, 10)] : undefined
    return mailtrapGetDailyStats(accounts[0].id, startDate, endDate, domainIds)
  },

  async getEvents(): Promise<EmailEvent[]> {
    // Mailtrap does not expose a generic event log endpoint
    return []
  },

  async getSuppressions(): Promise<SuppressionEntry[]> {
    // Mailtrap does not expose a suppression list
    return []
  },
}
