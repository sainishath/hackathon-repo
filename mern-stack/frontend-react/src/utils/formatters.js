export function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return 'Unspecified';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(val);
}

export function inrToWords(num) {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  num = Math.floor(num);
  let str = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore) str += inWords(crore) + ' Crore ';
  if (lakh) str += inWords(lakh) + ' Lakh ';
  if (thousand) str += inWords(thousand) + ' Thousand ';
  if (hundred) str += inWords(hundred) + ' Hundred ';
  if (num) str += (str ? 'and ' : '') + inWords(num) + ' ';

  return 'Rupees ' + str.trim() + ' Only';
}

export function sliderValueToINR(pct) {
  if (Math.abs(pct - 25) < 1.5) return 50000;
  if (Math.abs(pct - 50) < 1.5) return 500000;
  if (Math.abs(pct - 75) < 1.5) return 2500000;
  if (pct < 1) return 0;

  if (pct <= 25) {
    return Math.round((pct / 25) * 50000);
  } else if (pct <= 50) {
    return Math.round(50000 + ((pct - 25) / 25) * 450000);
  } else if (pct <= 75) {
    return Math.round(500000 + ((pct - 50) / 25) * 2000000);
  } else {
    return Math.round(2500000 + ((pct - 75) / 25) * 7500000);
  }
}

export function inrToSliderValue(val) {
  if (val <= 50000) return (val / 50000) * 25;
  if (val <= 500000) return 25 + ((val - 50000) / 450000) * 25;
  if (val <= 2500000) return 50 + ((val - 500000) / 2000000) * 25;
  return Math.min(100, 75 + ((val - 2500000) / 7500000) * 25);
}
