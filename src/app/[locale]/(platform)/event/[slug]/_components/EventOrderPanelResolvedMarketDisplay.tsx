'use client'

import { CheckIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { Button } from '@/components/ui/button'

interface EventOrderPanelResolvedMarketDisplayProps {
  resolvedOutcomeLabel: string | null
  isSingleMarket: boolean
  shouldShowResolvedSportsSubtitle: boolean
  resolvedMarketTitle: string | null
  hasClaimableWinnings: boolean
  claimPositionLabel: string
  claimValuePerShareLabel: string
  claimTotalLabel: string
  isClaimSubmitting: boolean
  isPositionsLoading: boolean
  onClaimWinnings: () => void
}

export default function EventOrderPanelResolvedMarketDisplay({
  resolvedOutcomeLabel,
  isSingleMarket,
  shouldShowResolvedSportsSubtitle,
  resolvedMarketTitle,
  hasClaimableWinnings,
  claimPositionLabel,
  claimValuePerShareLabel,
  claimTotalLabel,
  isClaimSubmitting,
  isPositionsLoading,
  onClaimWinnings,
}: EventOrderPanelResolvedMarketDisplayProps) {
  const t = useExtracted()

  return (
    <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary">
        <CheckIcon className="size-7 text-background" strokeWidth={3} />
      </div>
      <div className="text-lg font-bold text-primary">
        {t('Outcome:')}
        {' '}
        {resolvedOutcomeLabel}
      </div>
      {((!isSingleMarket || shouldShowResolvedSportsSubtitle) && resolvedMarketTitle) && (
        <div className="text-sm text-muted-foreground">{resolvedMarketTitle}</div>
      )}
      {hasClaimableWinnings && (
        <div className="mt-2 w-full space-y-3 text-left">
          <div className="w-full border-t border-border" />
          <p className="text-center text-base font-semibold text-foreground">{t('Your Earnings')}</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t('Position')}</span>
              <span className="text-right font-medium text-foreground">{claimPositionLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t('Value per share')}</span>
              <span className="text-right font-medium text-foreground">{claimValuePerShareLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t('Total')}</span>
              <span className="text-right font-medium text-foreground">{claimTotalLabel}</span>
            </div>
          </div>
          <Button
            type="button"
            className="h-10 w-full"
            onClick={onClaimWinnings}
            disabled={isClaimSubmitting || isPositionsLoading}
          >
            {isClaimSubmitting ? t('Submitting...') : t('Claim winnings')}
          </Button>
        </div>
      )}
    </div>
  )
}
