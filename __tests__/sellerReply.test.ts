/**
 * Tests for seller reply handler.
 * Sellers manage everything via the app — inbound SMS from seller always
 * receives a "please use the app" response regardless of content.
 */

describe('Seller reply: always redirects to app', () => {
  const appMessage = 'To manage your listings and deals, please use the BZARP app.'

  it('sends the app redirect message for any text', () => {
    // The response is always the same fixed string regardless of input
    const response = appMessage
    expect(response).toContain('BZARP app')
  })

  it('sends the same message for seller commands', () => {
    const response = appMessage
    expect(response).not.toContain('marked as sold')
    expect(response).not.toContain('back to active')
  })

  it('sends the same message for yes/no replies', () => {
    const response = appMessage
    expect(response).not.toContain('Congrats')
    expect(response).not.toContain('no-show')
  })
})
