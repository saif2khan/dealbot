import { Telnyx } from 'telnyx'

let _client: InstanceType<typeof Telnyx> | null = null

export function getTelnyxClient() {
  if (!_client) {
    _client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY! })
  }
  return _client
}

/** Find the messaging profile ID for a given profile name */
export async function getMessagingProfileId(profileName: string): Promise<string | null> {
  const telnyx = getTelnyxClient()
  const response = await (telnyx.messagingProfiles as unknown as {
    list: () => Promise<{ data: Array<{ id: string; name: string }> }>
  }).list()
  const match = response.data.find(p => p.name === profileName)
  return match?.id ?? null
}

/** List all numbers under a messaging profile */
export async function listNumbersInProfile(messagingProfileId: string): Promise<Array<{ id: string; phone_number: string }>> {
  const telnyx = getTelnyxClient()
  const response = await (telnyx.phoneNumbers as unknown as {
    list: (params: object) => Promise<{ data: Array<{ id: string; phone_number: string }> }>
  }).list({ filter: { messaging_profile_id: messagingProfileId } })
  return response.data
}

/** Search available numbers in a given country */
export async function searchNumbers(countryCode: string, limit = 10) {
  const telnyx = getTelnyxClient()
  const response = await (telnyx.availablePhoneNumbers as unknown as {
    list: (params: object) => Promise<{ data: Array<{ phone_number: string; id?: string }> }>
  }).list({
    filter: {
      country_code: countryCode,
      features: ['sms'],
      limit,
    },
  })
  return response.data
}

/** Purchase a phone number */
export async function purchaseNumber(phoneNumber: string) {
  const telnyx = getTelnyxClient()
  const order = await (telnyx.numberOrders as unknown as {
    create: (params: object) => Promise<{ data: unknown }>
  }).create({
    phone_numbers: [{ phone_number: phoneNumber }],
  })
  return order.data
}

/** Look up a phone number's resource ID by its E.164 number string */
export async function getPhoneNumberId(phoneNumber: string): Promise<string> {
  const telnyx = getTelnyxClient()
  // Retry a few times — number may take a moment to appear after ordering
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await (telnyx.phoneNumbers as unknown as {
      list: (params: object) => Promise<{ data: Array<{ id: string; phone_number: string }> }>
    }).list({ filter: { phone_number: phoneNumber } })

    const match = response.data.find(n => n.phone_number === phoneNumber)
    if (match) return match.id

    await new Promise(res => setTimeout(res, 2000))
  }
  throw new Error(`Could not find provisioned number ${phoneNumber} after retries`)
}

/** Assign a phone number to a messaging profile */
export async function assignToMessagingProfile(numberId: string, profileId: string) {
  const telnyx = getTelnyxClient()
  await (telnyx.phoneNumbers as unknown as {
    update: (id: string, params: object) => Promise<unknown>
  }).update(numberId, {
    messaging: { messaging_profile_id: profileId },
  })
}

/** Register a webhook for inbound SMS on a phone number */
export async function registerWebhook(phoneNumberId: string, webhookUrl: string) {
  const telnyx = getTelnyxClient()
  await (telnyx.phoneNumbers as unknown as {
    update: (id: string, params: object) => Promise<unknown>
  }).update(phoneNumberId, {
    webhook_url: webhookUrl,
    webhook_failover_url: '',
  })
}

/** Send an outbound SMS */
export async function sendSms(from: string, to: string, text: string) {
  const telnyx = getTelnyxClient()
  const message = await (telnyx.messages as unknown as {
    send: (params: object) => Promise<{ data: unknown }>
  }).send({ from, to, text })
  return message.data
}

/** Release / delete a phone number */
export async function releaseNumber(telnyxNumberId: string) {
  const telnyx = getTelnyxClient()
  await (telnyx.phoneNumbers as unknown as {
    delete: (id: string) => Promise<unknown>
  }).delete(telnyxNumberId)
}

/** Verify Telnyx webhook signature */
export function verifyTelnyxSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const crypto = require('crypto') as typeof import('crypto')
  const publicKeyBase64 = process.env.TELNYX_PUBLIC_KEY!
  const toVerify = `${timestamp}|${payload}`
  try {
    // Telnyx provides a raw base64-encoded Ed25519 public key (32 bytes).
    // Wrap it in a DER SPKI envelope so Node's crypto can load it.
    const rawKey = Buffer.from(publicKeyBase64, 'base64')
    const spkiHeader = Buffer.from('302a300506032b6570032100', 'hex')
    const derKey = Buffer.concat([spkiHeader, rawKey])
    const keyObject = crypto.createPublicKey({ key: derKey, format: 'der', type: 'spki' })
    // Ed25519 uses null as the digest algorithm
    return crypto.verify(null, Buffer.from(toVerify), keyObject, Buffer.from(signature, 'base64'))
  } catch {
    return false
  }
}
