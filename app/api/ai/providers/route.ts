import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { providerRegistry } from '@/lib/ai/providers'
import { FEATURE_PROVIDER_CONFIG } from '@/lib/ai/config'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const availableProviders = providerRegistry.getAvailable()
  const defaultProvider = providerRegistry.getDefault()

  return NextResponse.json({
    success: true,
    data: {
      providers: availableProviders.map((p) => ({
        name: p.name,
        displayName: p.displayName,
        models: p.models.map((m) => ({
          id: m.id,
          name: m.name,
          contextWindow: m.contextWindow,
          maxOutputTokens: m.maxOutputTokens,
          capabilities: m.capabilities,
        })),
        supportsStreaming: p.supportsStreaming(),
        supportsToolUse: p.supportsToolUse(),
      })),
      defaultProvider: defaultProvider.name,
      featureDefaults: FEATURE_PROVIDER_CONFIG,
    },
  })
}
