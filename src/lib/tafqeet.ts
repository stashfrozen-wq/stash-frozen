const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertGroup(n: number): string {
    let text = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) text += hundreds[h];

    if (t === 1 && o > 0) {
        if (text !== '') text += ' و ';
        if (o === 1) text += 'أحد عشر';
        else if (o === 2) text += 'اثنا عشر';
        else text += ones[o] + ' عشر';
        return text;
    } 
    
    if (o > 0) {
        if (text !== '') text += ' و ';
        text += ones[o];
    }
    if (t > 0) {
        if (text !== '') text += ' و ';
        text += tens[t];
    }
    return text;
}

function handleMillions(millions: number): string {
    if (millions === 0) return '';
    if (millions === 1) return 'مليون';
    if (millions === 2) return 'مليونان';
    if (millions >= 3 && millions <= 10) return convertGroup(millions) + ' ملايين';
    return convertGroup(millions) + ' مليون';
}

function handleThousands(thousands: number, hasPrevious: boolean): string {
    if (thousands === 0) return '';
    const prefix = hasPrevious ? ' و ' : '';
    if (thousands === 1) return prefix + 'ألف';
    if (thousands === 2) return prefix + 'ألفان';
    if (thousands >= 3 && thousands <= 10) return prefix + convertGroup(thousands) + ' آلاف';
    return prefix + convertGroup(thousands) + ' ألف';
}

export function tafqeet(number: number): string {
    const fraction = Math.round((number % 1) * 100);
    const num = Math.floor(number);

    if (num === 0) return fraction > 0 ? `فقط ${fraction} قرشاً لا غير` : 'صفر';

    let result = handleMillions(Math.floor(num / 1000000));
    
    const thousands = Math.floor((num % 1000000) / 1000);
    result += handleThousands(thousands, result !== '');

    const rest = num % 1000;
    if (rest > 0) {
        if (result !== '') result += ' و ';
        result += convertGroup(rest);
    }

    let finalStr = `فقط ${result} جنيهاً مصرياً`;
    if (fraction > 0) {
        finalStr += ` و ${fraction} قرشاً`;
    }
    return finalStr + ' لا غير';
}
