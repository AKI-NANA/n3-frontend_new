/**
 * eBay Account API クライアント
 * https://developer.ebay.com/api-docs/sell/account/overview.html
 *
 * このモジュールはeBay Account APIのRestrictedUserリソースを操作します：
 * - getRestrictedUserList: 既存のブロックバイヤーリストを取得
 * - setRestrictedUserList: ブロックバイヤーリストを更新
 */

import {
  EbayRestrictedUserList,
  EbayRestrictedUser,
  SetRestrictedUserListRequest
} from '@/types/ebay-blocklist'

const EBAY_API_BASE_URL = 'https://api.ebay.com'

/**
 * eBay Account API の基本リクエスト関数
 */
async function ebayAccountApiRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EBAY_API_BASE_URL}${endpoint}`

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('eBay Account API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`eBay Account API Error: ${response.status} ${response.statusText}`)
    }

    // 204 No Content の場合は空オブジェクトを返す
    if (response.status === 204) {
      return {} as T
    }

    return await response.json()
  } catch (error) {
    console.error('eBay Account API Request Failed:', {
      endpoint,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * 既存のブロックバイヤーリストを取得
 * GET /sell/account/v1/restricted_user_list
 */
export async function getRestrictedUserList(
  accessToken: string
): Promise<EbayRestrictedUserList> {
  try {
    const response = await ebayAccountApiRequest<any>(
      '/sell/account/v1/restricted_user_list',
      accessToken,
      { method: 'GET' }
    )

    // レスポンスを正規化
    const users: EbayRestrictedUser[] = response.restrictedUsers?.map((user: any) => ({
      userId: user.userId || '',
      userName: user.userName || '',
    })) || []

    return {
      users,
      total: users.length,
    }
  } catch (error) {
    console.error('Failed to get restricted user list:', error)
    // エラーの場合は空のリストを返す
    return {
      users: [],
      total: 0,
    }
  }
}

/**
 * ブロックバイヤーリストを更新（上書き）
 * PUT /sell/account/v1/restricted_user_list
 *
 * 注意: このAPIは既存のリスト全体を上書きします
 * 既存のリストを保持したい場合は、事前にgetRestrictedUserListで取得してマージしてください
 */
export async function setRestrictedUserList(
  accessToken: string,
  usernames: string[]
): Promise<void> {
  // APIの制限: 最大5000または6000件
  const MAX_BLOCKLIST_SIZE = 5000

  if (usernames.length > MAX_BLOCKLIST_SIZE) {
    throw new Error(
      `Blocklist size exceeds maximum limit. Maximum: ${MAX_BLOCKLIST_SIZE}, Provided: ${usernames.length}`
    )
  }

  const payload: SetRestrictedUserListRequest = {
    restrictedUsers: usernames.map(username => ({
      userName: username.trim(),
    }))
  }

  try {
    await ebayAccountApiRequest<void>(
      '/sell/account/v1/restricted_user_list',
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    )

    console.log(`Successfully updated restricted user list with ${usernames.length} buyers`)
  } catch (error) {
    console.error('Failed to set restricted user list:', error)
    throw error
  }
}

/**
 * 既存のブロックリストと新しいリストをマージ
 * 重複を排除し、最大サイズ制限内に収める
 */
export function mergeBlocklists(
  existingList: string[],
  sharedList: string[],
  maxSize: number = 5000
): string[] {
  // Set を使って重複を排除
  const mergedSet = new Set<string>([
    ...existingList.map(u => u.trim().toLowerCase()),
    ...sharedList.map(u => u.trim().toLowerCase()),
  ])

  const mergedArray = Array.from(mergedSet)

  // 最大サイズを超える場合は警告
  if (mergedArray.length > maxSize) {
    console.warn(
      `Merged blocklist size (${mergedArray.length}) exceeds maximum (${maxSize}). Truncating...`
    )
    return mergedArray.slice(0, maxSize)
  }

  return mergedArray
}

/**
 * ブロックリストの差分を計算
 */
export function calculateBlocklistDiff(
  oldList: string[],
  newList: string[]
): { added: string[], removed: string[] } {
  const oldSet = new Set(oldList.map(u => u.trim().toLowerCase()))
  const newSet = new Set(newList.map(u => u.trim().toLowerCase()))

  const added = newList.filter(u => !oldSet.has(u.trim().toLowerCase()))
  const removed = oldList.filter(u => !newSet.has(u.trim().toLowerCase()))

  return { added, removed }
}

/**
 * ブロックリストをeBayに同期
 * 既存のリストを取得 → 共有リストとマージ → eBayに送信
 */
export async function syncBlocklistToEbay(
  accessToken: string,
  sharedBlocklist: string[]
): Promise<{
  success: boolean
  buyersAdded: number
  buyersRemoved: number
  totalBuyers: number
  errors?: string[]
}> {
  const startTime = Date.now()

  try {
    // 1. 既存のブロックリストを取得
    console.log('Fetching existing blocklist from eBay...')
    const existingList = await getRestrictedUserList(accessToken)
    const existingUsernames = existingList.users.map(u => u.userName)

    console.log(`Existing blocklist size: ${existingUsernames.length}`)
    console.log(`Shared blocklist size: ${sharedBlocklist.length}`)

    // 2. マージ
    const mergedList = mergeBlocklists(existingUsernames, sharedBlocklist)
    console.log(`Merged blocklist size: ${mergedList.length}`)

    // 3. 差分を計算
    const diff = calculateBlocklistDiff(existingUsernames, mergedList)
    console.log(`Buyers to add: ${diff.added.length}`)
    console.log(`Buyers to remove: ${diff.removed.length}`)

    // 4. eBayに送信
    console.log('Updating blocklist on eBay...')
    await setRestrictedUserList(accessToken, mergedList)

    const duration = Date.now() - startTime
    console.log(`Sync completed in ${duration}ms`)

    return {
      success: true,
      buyersAdded: diff.added.length,
      buyersRemoved: diff.removed.length,
      totalBuyers: mergedList.length,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Sync failed after ${duration}ms:`, error)

    return {
      success: false,
      buyersAdded: 0,
      buyersRemoved: 0,
      totalBuyers: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}
