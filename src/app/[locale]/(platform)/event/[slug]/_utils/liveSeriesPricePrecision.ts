export function resolveLiveSeriesTopicPriceDigits(topic: string) {
  return topic.trim().toLowerCase() === 'equity_prices' ? 2 : 4
}

function resolveAdaptiveCryptoPriceDigits(referencePrice?: number | null) {
  const numericPrice = Number(referencePrice)
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return 4
  }

  if (Math.abs(numericPrice) >= 10) {
    return 2
  }

  return 4
}

export function resolveLiveSeriesPriceDisplayDigits(
  topic: string,
  showPriceDecimals: boolean,
  referencePrice?: number | null,
) {
  const isEquityTopic = topic.trim().toLowerCase() === 'equity_prices'
  if (isEquityTopic) {
    return showPriceDecimals ? 2 : 0
  }

  return resolveAdaptiveCryptoPriceDigits(referencePrice)
}
