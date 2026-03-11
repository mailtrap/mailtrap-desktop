import axios, { AxiosInstance } from 'axios'

// The Mailtrap SDK uses https://mailtrap.io as the GENERAL_ENDPOINT
// for all account/project/inbox/message operations.
// Stats endpoints also live here.
export const GENERAL_BASE_URL = 'https://mailtrap.io'

let apiClient: AxiosInstance | null = null

export function initApiClients(token: string): void {
  apiClient = axios.create({
    baseURL: GENERAL_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  })
}

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initApiClients() first.')
  }
  return apiClient
}

export function destroyApiClients(): void {
  apiClient = null
}
