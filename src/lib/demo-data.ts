const EXCHANGE_RATE = 1450

// 50+ 종목의 다양한 포트폴리오 데이터
const US_STOCKS = [
  { code: 'NVDA', name: 'NVIDIA Corp', price: 145, buyPrice: 80 },
  { code: 'TSLA', name: 'Tesla Inc', price: 240, buyPrice: 180 },
  { code: 'AAPL', name: 'Apple Inc', price: 225, buyPrice: 150 },
  { code: 'MSFT', name: 'Microsoft', price: 420, buyPrice: 300 },
  { code: 'GOOGL', name: 'Alphabet Inc', price: 175, buyPrice: 130 },
  { code: 'AMZN', name: 'Amazon.com', price: 185, buyPrice: 140 },
  { code: 'META', name: 'Meta Platforms', price: 550, buyPrice: 350 },
  { code: 'AVGO', name: 'Broadcom Inc', price: 175, buyPrice: 120 },
  { code: 'AMD', name: 'AMD Inc', price: 140, buyPrice: 100 },
  { code: 'INTC', name: 'Intel Corp', price: 22, buyPrice: 35 }, // 손실
  { code: 'QCOM', name: 'Qualcomm', price: 170, buyPrice: 140 },
  { code: 'CRM', name: 'Salesforce', price: 280, buyPrice: 200 },
  { code: 'NFLX', name: 'Netflix Inc', price: 720, buyPrice: 450 },
  { code: 'TQQQ', name: 'ProShares UltraPro QQQ', price: 65, buyPrice: 45 },
  { code: 'SOXL', name: 'Direxion Semi Bull 3X', price: 32, buyPrice: 25 },
  { code: 'SPY', name: 'SPDR S&P 500 ETF', price: 540, buyPrice: 450 },
  { code: 'QQQ', name: 'Invesco QQQ Trust', price: 460, buyPrice: 380 },
  { code: 'ARKK', name: 'ARK Innovation ETF', price: 52, buyPrice: 80 }, // 손실
  { code: 'PLTR', name: 'Palantir', price: 45, buyPrice: 18 },
  { code: 'COIN', name: 'Coinbase', price: 250, buyPrice: 180 },
]

const KR_STOCKS = [
  { code: '005930', name: '삼성전자', price: 78000, buyPrice: 70000 },
  { code: '000660', name: 'SK하이닉스', price: 210000, buyPrice: 140000 },
  { code: '373220', name: 'LG에너지솔루션', price: 420000, buyPrice: 500000 }, // 손실
  { code: '207940', name: '삼성바이오로직스', price: 850000, buyPrice: 700000 },
  { code: '005380', name: '현대차', price: 215000, buyPrice: 180000 },
  { code: '035420', name: 'NAVER', price: 195000, buyPrice: 220000 }, // 손실
  { code: '035720', name: '카카오', price: 42000, buyPrice: 65000 }, // 손실
  { code: '051910', name: 'LG화학', price: 320000, buyPrice: 380000 }, // 손실
  { code: '006400', name: '삼성SDI', price: 380000, buyPrice: 450000 }, // 손실
  { code: '003670', name: '포스코퓨처엠', price: 220000, buyPrice: 280000 }, // 손실
]

const KR_ETFS = [
  { code: '360750', name: 'TIGER 미국테크TOP10', price: 22000, buyPrice: 18000 },
  { code: '133690', name: 'TIGER 나스닥100', price: 105000, buyPrice: 90000 },
  { code: '402970', name: 'ACE 글로벌반도체TOP4', price: 35000, buyPrice: 28000 },
  { code: '448440', name: 'KODEX 일본리츠(H)', price: 12000, buyPrice: 10000 },
  { code: '453810', name: 'TIGER AI반도체', price: 15000, buyPrice: 12000 },
  { code: '379810', name: 'TIGER 미국나스닥100커버드콜', price: 11000, buyPrice: 10500 },
  { code: '411060', name: 'TIGER 미국배당다우존스', price: 13500, buyPrice: 12000 },
  { code: '329200', name: 'TIGER 리츠부동산', price: 5200, buyPrice: 5500 }, // 손실
  { code: '091160', name: 'KODEX 반도체', price: 42000, buyPrice: 35000 },
  { code: '069500', name: 'KODEX 200', price: 38000, buyPrice: 35000 },
  { code: '305720', name: 'KODEX 2차전지산업', price: 8500, buyPrice: 12000 }, // 손실
  { code: '364970', name: 'TIGER 글로벌인공지능', price: 11000, buyPrice: 9000 },
  { code: '465580', name: 'TIMEFOLIO 글로벌AI인공지능', price: 12500, buyPrice: 10000 },
  { code: '448540', name: 'PLUS 미국테크TOP10', price: 14000, buyPrice: 11000 },
  { code: '449190', name: 'TIGER 미국필라델피아반도체', price: 13500, buyPrice: 10000 },
]

function generateHolding(
  stock: { code: string; name: string; price: number; buyPrice: number },
  qty: number,
  isUS: boolean
) {
  const currentPrice = isUS ? stock.price * EXCHANGE_RATE : stock.price
  const buyAvgPrice = isUS ? stock.buyPrice * EXCHANGE_RATE : stock.buyPrice
  return {
    stockCode: stock.code,
    stockName: stock.name,
    quantity: qty,
    currentPrice,
    buyAvgPrice,
    evaluationAmount: qty * currentPrice,
    buyAmount: qty * buyAvgPrice,
    profitLossAmount: qty * currentPrice - qty * buyAvgPrice,
    profitLossRate: ((stock.price - stock.buyPrice) / stock.buyPrice) * 100,
  }
}

export const DEMO_BALANCES = [
  // 1. 위탁종합 (General Account - High Growth US Stocks) - 20종목
  {
    account: {
      accountNo: '55234055',
      productCode: '01',
      accountName: 'US Tech Growth',
    },
    summary: {
      totalBuyAmount: 550000000,
      totalEvaluationAmount: 750000000,
      totalProfitLossAmount: 200000000,
      depositAmount: 5000000,
      totalAsset: 755000000,
      totalProfitLossRate: 36.4,
    },
    holdings: [...US_STOCKS.map((s, i) => generateHolding(s, 50 + i * 10, true))],
    lastUpdated: new Date().toISOString(),
  },
  // 2. 연금저축 (Pension - Korean ETFs) - 15종목
  {
    account: {
      accountNo: '33921022',
      productCode: '22',
      accountName: 'Pension ETF',
    },
    summary: {
      totalBuyAmount: 350000000,
      totalEvaluationAmount: 420000000,
      totalProfitLossAmount: 70000000,
      depositAmount: 10000000,
      totalAsset: 430000000,
      totalProfitLossRate: 20.0,
    },
    holdings: [...KR_ETFS.map((s, i) => generateHolding(s, 500 + i * 100, false))],
    lastUpdated: new Date().toISOString(),
  },
  // 3. ISA (Tax Advantage - Korean Stocks) - 10종목
  {
    account: {
      accountNo: '77219011',
      productCode: '11',
      accountName: 'ISA Value',
    },
    summary: {
      totalBuyAmount: 200000000,
      totalEvaluationAmount: 180000000,
      totalProfitLossAmount: -20000000,
      depositAmount: 2000000,
      totalAsset: 182000000,
      totalProfitLossRate: -10.0,
    },
    holdings: [...KR_STOCKS.map((s, i) => generateHolding(s, 20 + i * 5, false))],
    lastUpdated: new Date().toISOString(),
  },
  // 4. IRP (Retirement Pension) - 10종목
  {
    account: {
      accountNo: '88123456',
      productCode: '29',
      accountName: 'IRP Balanced',
      isPension: true,
    },
    summary: {
      totalBuyAmount: 100000000,
      totalEvaluationAmount: 115000000,
      totalProfitLossAmount: 15000000,
      depositAmount: 3000000,
      totalAsset: 118000000,
      totalProfitLossRate: 15.0,
    },
    holdings: [
      generateHolding(KR_ETFS[0], 1000, false),
      generateHolding(KR_ETFS[1], 500, false),
      generateHolding(KR_ETFS[2], 800, false),
      generateHolding(KR_ETFS[6], 2000, false),
      generateHolding(KR_STOCKS[0], 100, false),
      generateHolding(KR_STOCKS[1], 30, false),
      generateHolding(US_STOCKS[0], 20, true),
      generateHolding(US_STOCKS[3], 15, true),
      generateHolding(US_STOCKS[15], 30, true), // SPY
      generateHolding(US_STOCKS[16], 25, true), // QQQ
    ],
    lastUpdated: new Date().toISOString(),
  },
]

// 총 holdings: 20 + 15 + 10 + 10 = 55개 이상
