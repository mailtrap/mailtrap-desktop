import { useState } from 'react'
import { Button } from '../ui/Button'

interface AddSenderProps {
  onBack: () => void
  onSuccess: (accountId: number, accountName: string, senderId: string, displayName: string) => void
}

export default function AddSender({ onBack, onSuccess }: AddSenderProps) {
  const [displayName, setDisplayName] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = displayName.trim()
    const trimmedToken = token.trim()

    if (!trimmedName) {
      setError('Please enter a display name.')
      return
    }
    if (!trimmedToken) {
      setError('Please enter your API token.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.electron.addSender(trimmedName, trimmedToken)
      if (result.success) {
        onSuccess(result.accountId, result.accountName, result.senderId, trimmedName)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Connection failed. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <svg className="h-12" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.8047 29.3446L3.42064 31.358C2.96157 31.6608 3.17134 32.1813 3.42064 32.2861L16.5632 39.6726C17.3395 40.1089 18.296 40.1089 19.0723 39.6726L32.3889 32.1883C32.7924 31.9486 32.7261 31.4613 32.3889 31.2969L28.8108 29.3577C28.5087 29.1579 27.8353 29.2243 27.5967 29.3871L19.0723 34.178C18.296 34.6143 17.3395 34.6143 16.5632 34.178L7.96324 29.3446C7.64264 29.1468 7.13479 29.158 6.8047 29.3446Z" fill="#FBFCFC"/>
              <path d="M16.5638 0.327232C17.3401 -0.109077 18.2966 -0.109077 19.0729 0.327232C19.0729 0.327232 29.0366 5.92712 29.6563 6.27544C30.0789 6.48986 30.1172 7.0655 29.6563 7.32508C28.9611 7.71446 28.0292 8.23577 27.2543 8.66925C26.3425 9.17924 25.2316 9.17773 24.3209 8.66588L19.0729 5.71635C18.2966 5.28004 17.3401 5.28004 16.5638 5.71635L11.3096 8.66939C10.3983 9.18156 9.28635 9.18256 8.37406 8.67216C7.56833 8.22138 6.59315 7.6761 5.88977 7.28379C5.49835 7.11518 5.41688 6.61464 5.88977 6.32634L16.5638 0.327232Z" fill="#FBFCFC"/>
              <path d="M34.3823 9.28039C35.1586 9.71669 35.6369 10.523 35.6369 11.3956V28.6042C35.6369 29.4559 35.1052 29.6148 34.538 29.3174L30.6187 27.1955V15.6262L19.073 22.1152C18.2967 22.5515 17.3402 22.5515 16.5639 22.1152L5.01816 15.6262V27.1941L1.45682 29.3149C1.03239 29.5856 0 29.6709 0 28.6042V11.3956C0 10.523 0.478227 9.71669 1.25454 9.28039C2.50358 8.62429 3.7942 9.28039 3.7942 9.28039L17.8184 17.1796L31.8207 9.28039C31.8207 9.28039 33.0642 8.52812 34.3823 9.28039Z" fill="#22D172"/>
              <path d="M128.726 12.5985C132.191 12.5985 135 15.4159 135 18.8915V19.1532C135 22.6289 132.191 25.4471 128.726 25.4471C127.495 25.4471 126.348 25.0914 125.379 24.4774V29.8534C125.379 29.9464 125.303 30.0214 125.21 30.0214H122.62C122.527 30.0214 122.452 29.9464 122.452 29.8534V18.8915C122.452 15.4159 125.261 12.5986 128.726 12.5985ZM74.7188 12.5985C78.1836 12.5987 80.9921 15.416 80.9922 18.8915V24.8983C80.992 24.9914 80.917 25.0672 80.8242 25.0673H78.2334C78.1408 25.067 78.0656 24.9913 78.0654 24.8983V24.3192C77.1069 25.0088 75.9631 25.4471 74.7188 25.4471C71.2537 25.4471 68.4443 22.6289 68.4443 19.1532V18.8915C68.4444 15.4159 71.2538 12.5985 74.7188 12.5985ZM114.007 12.5985C117.472 12.5985 120.281 15.4159 120.281 18.8915V24.8983C120.281 24.9913 120.206 25.0671 120.113 25.0673H117.522C117.43 25.0672 117.355 24.9914 117.354 24.8983V24.202C116.432 24.9008 115.227 25.4471 114.007 25.4471C110.542 25.447 107.733 22.6287 107.733 19.1532V18.8915C107.733 15.416 110.542 12.5987 114.007 12.5985ZM61.8711 12.5985C64.7262 12.5985 67.041 14.9202 67.041 17.7841V24.8983C67.0409 24.9914 66.9658 25.0672 66.873 25.0673H64.2822C64.1896 25.067 64.1144 24.9913 64.1143 24.8983V17.7841C64.1143 16.5416 63.1098 15.5341 61.8711 15.5341C60.6326 15.5343 59.6289 16.5417 59.6289 17.7841V24.8983C59.6288 24.9914 59.5528 25.0673 59.46 25.0673H56.8701C56.7773 25.0673 56.7013 24.9914 56.7012 24.8983V17.7841C56.7012 16.5416 55.6976 15.5342 54.459 15.5341C53.2203 15.5341 52.2158 16.5416 52.2158 17.7841V24.8983C52.2157 24.9913 52.1406 25.0671 52.0479 25.0673H49.457C49.3643 25.0671 49.2892 24.9913 49.2891 24.8983V17.7841C49.2891 14.9202 51.6038 12.5985 54.459 12.5985C55.9125 12.5986 57.226 13.2004 58.165 14.1688C59.104 13.2004 60.4176 12.5986 61.8711 12.5985ZM86.1816 13.1112C86.2742 13.1114 86.3494 13.1863 86.3496 13.2792V24.8983C86.3495 24.9913 86.2743 25.0671 86.1816 25.0673H83.5908C83.498 25.0672 83.423 24.9914 83.4229 24.8983V13.2792C83.4231 13.1862 83.4981 13.1113 83.5908 13.1112H86.1816ZM106.845 13.0135C106.937 13.0138 107.013 13.0895 107.013 13.1825V15.7811C107.013 15.8258 106.994 15.8687 106.963 15.9003C106.931 15.9316 106.889 15.949 106.845 15.9491C105.382 15.9491 104.196 17.1393 104.196 18.6063V24.8983C104.196 24.9914 104.12 25.0673 104.027 25.0673H101.438C101.345 25.0673 101.27 24.9914 101.27 24.8983V18.6063C101.27 15.5179 103.766 13.0135 106.845 13.0135ZM91.8076 7.92957C91.9005 7.92957 91.9756 8.0053 91.9756 8.09851V24.8983C91.9754 24.9913 91.9004 25.0663 91.8076 25.0663H89.2178C89.125 25.0663 89.049 24.9913 89.0488 24.8983V8.09851C89.0488 8.0053 89.1249 7.92957 89.2178 7.92957H91.8076ZM97.5459 7.92957C97.6388 7.92957 97.7139 8.0053 97.7139 8.09851V13.1112H100.334C100.427 13.1112 100.502 13.1862 100.502 13.2792V15.7665C100.502 15.8595 100.427 15.9344 100.334 15.9344H97.7139V24.8983C97.7137 24.9914 97.6387 25.0663 97.5459 25.0663H94.9561C94.8633 25.0663 94.7873 24.9914 94.7871 24.8983V8.09851C94.7871 8.0053 94.8631 7.92957 94.9561 7.92957H97.5459ZM74.7188 15.5341C72.8702 15.5341 71.3711 17.0373 71.3711 18.8915V19.1532C71.3711 21.0075 72.8702 22.5106 74.7188 22.5106C76.5672 22.5104 78.0654 21.0073 78.0654 19.1532V18.8915C78.0654 17.0374 76.5671 15.5342 74.7188 15.5341ZM114.007 15.5341C112.158 15.5342 110.66 17.0374 110.66 18.8915V19.1532C110.66 21.0073 112.158 22.5104 114.007 22.5106C115.855 22.5106 117.354 21.0075 117.354 19.1532V18.8915C117.354 17.0373 115.855 15.5341 114.007 15.5341ZM128.726 15.5341C126.877 15.5342 125.379 17.0373 125.379 18.8915V19.1532C125.379 21.0074 126.877 22.5105 128.726 22.5106C130.574 22.5106 132.073 21.0075 132.073 19.1532V18.8915C132.073 17.0373 130.574 15.5341 128.726 15.5341ZM84.8574 7.92957C85.7994 7.92959 86.5635 8.69559 86.5635 9.6405C86.5635 10.5854 85.7994 11.3514 84.8574 11.3514C83.9154 11.3514 83.1514 10.5854 83.1514 9.6405C83.1514 8.69558 83.9154 7.92957 84.8574 7.92957Z" fill="#FBFCFC"/>
            </svg>
          </div>
          <h1 className="text-heading-1 text-navy-air mb-1">Add sender</h1>
          <p className="text-body text-grey-muted mb-6">
            Give this account a name you'll recognise
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-heading-3 text-navy-air"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Work, Personal, Client A"
              className="input"
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="apiToken"
              className="mb-1.5 block text-heading-3 text-navy-air"
            >
              API Token
            </label>
            <input
              id="apiToken"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Mailtrap API token"
              className="input"
              disabled={loading}
            />
            <p className="mt-1 text-body-s text-grey-muted">
              You can find it in{' '}
              <a
                href="https://mailtrap.io/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-neutral hover:text-blue-medium underline"
              >
                Settings &rarr; API Tokens
              </a>
            </p>
          </div>

          {error && (
            <div className="rounded-mtui border border-red-shade bg-red-solid px-4 py-3 text-body text-red-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
            disabled={loading}
          >
            Cancel
          </Button>
        </form>
      </div>
    </div>
  )
}
