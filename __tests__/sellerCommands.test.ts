/**
 * Tests for seller command detection.
 * Uses jest.resetModules + jest.doMock to correctly mock the module-level Anthropic client.
 */
import type { Item } from '@/types/database'

const baseItem: Item = {
  id: 'item-1',
  user_id: 'user-1',
  name: 'Blue IKEA Couch',
  description: 'Comfortable couch',
  category: 'furniture',
  tags: [],
  condition: 'good',
  asking_price: 100,
  max_discount: 20,
  firm_price: false,
  preferred_times: null,
  status: 'active',
  pending_buyer_id: null,
  final_sale_price: null,
  created_at: '2026-01-01T00:00:00Z',
  archived_at: null,
}

let detectSellerCommand: (msg: string, items: Item[]) => Promise<unknown>
let mockCreate: jest.Mock

beforeEach(async () => {
  jest.resetModules()
  mockCreate = jest.fn()
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  }))
  const mod = await import('@/lib/agent/sellerCommands')
  detectSellerCommand = mod.detectSellerCommand
})

afterEach(() => {
  jest.dontMock('@anthropic-ai/sdk')
})

function mockClaudeResponse(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
  })
}

describe('detectSellerCommand', () => {
  it('returns NONE immediately when no items provided — does not call Claude', async () => {
    const result = await detectSellerCommand('mark couch as sold', [])
    expect(result).toEqual({ type: 'NONE' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('detects STATUS_CHANGE sold', async () => {
    mockClaudeResponse('{"type":"STATUS_CHANGE","itemName":"Blue IKEA Couch","newStatus":"sold"}')
    const result = await detectSellerCommand('mark couch as sold', [baseItem])
    expect(result).toEqual({ type: 'STATUS_CHANGE', itemName: 'Blue IKEA Couch', newStatus: 'sold' })
  })

  it('detects STATUS_CHANGE active', async () => {
    mockClaudeResponse('{"type":"STATUS_CHANGE","itemName":"Blue IKEA Couch","newStatus":"active"}')
    const result = await detectSellerCommand('deal fell through on couch', [baseItem])
    expect(result).toEqual({ type: 'STATUS_CHANGE', itemName: 'Blue IKEA Couch', newStatus: 'active' })
  })

  it('detects CANCEL_DEAL', async () => {
    mockClaudeResponse('{"type":"CANCEL_DEAL","itemName":"Blue IKEA Couch"}')
    const result = await detectSellerCommand('cancel deal on the couch', [baseItem])
    expect(result).toEqual({ type: 'CANCEL_DEAL', itemName: 'Blue IKEA Couch' })
  })

  it('returns NONE for general questions', async () => {
    mockClaudeResponse('{"type":"NONE"}')
    const result = await detectSellerCommand('how many items do I have?', [baseItem])
    expect(result).toEqual({ type: 'NONE' })
  })

  it('strips markdown code block wrapper from Claude response', async () => {
    mockClaudeResponse('```json\n{"type":"STATUS_CHANGE","itemName":"Blue IKEA Couch","newStatus":"sold"}\n```')
    const result = await detectSellerCommand('sold the couch', [baseItem])
    expect(result).toEqual({ type: 'STATUS_CHANGE', itemName: 'Blue IKEA Couch', newStatus: 'sold' })
  })

  it('returns NONE when Claude response is not valid JSON', async () => {
    mockClaudeResponse('Sorry, I could not understand that.')
    const result = await detectSellerCommand('some message', [baseItem])
    expect(result).toEqual({ type: 'NONE' })
  })

  it('returns NONE when Claude API throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API error'))
    const result = await detectSellerCommand('mark couch as sold', [baseItem])
    expect(result).toEqual({ type: 'NONE' })
  })
})
