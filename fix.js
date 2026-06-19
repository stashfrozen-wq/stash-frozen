/* eslint-disable */
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('page.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles('src/app/[locale]/(dashboard)');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // We have different patterns for the title block.
    // Let's just remove the <div> that wraps the title, if it's cleanly identifiable.
    // Otherwise, we just strip the <h2> and <p>.
    
    // Pattern for Customer page:
    // <div className="flex items-center gap-4">
    //     <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-sm">
    //         <Users size={32} />
    //     </div>
    //     <div>
    //         <h2 ...>{t('title')}</h2>
    //         <p ...>{t('subtitle')}</p>
    //     </div>
    // </div>
    const regexCustomers = /<div className="flex items-center gap-4">\s*<div[^>]*>\s*<[A-Z][A-Za-z0-9]*[^>]*\/>\s*<\/div>\s*<div>\s*<h2[^>]*>[\s\S]*?\{t\('title'\)\}\s*<\/h2>\s*<p[^>]*>\{t\('subtitle'\)\}<\/p>\s*<\/div>\s*<\/div>/g;

    // Pattern for Stocktake page:
    // <div>
    //     <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
    //         <ClipboardCheck className="text-primary" />
    //         {t('title')}
    //     </h2>
    //     <p className="text-muted-foreground">{t('subtitle')}</p>
    // </div>
    const regexStandard = /<div(?: className="[^"]*")?>\s*<h2[^>]*>[\s\S]*?\{t\('title'\)\}\s*<\/h2>\s*<p[^>]*>\{t\('subtitle'\)\}<\/p>\s*<\/div>/g;
    
    // Fallback: just remove h2 and p
    const regexH2 = /<h2[^>]*>[\s\S]*?\{t\('title'\)\}\s*<\/h2>/g;
    const regexP = /<p[^>]*>\{t\('subtitle'\)\}<\/p>/g;

    let original = content;

    if (regexCustomers.test(content)) {
        content = content.replace(regexCustomers, '');
    } else if (regexStandard.test(content)) {
        content = content.replace(regexStandard, '');
    } else {
        content = content.replace(regexH2, '');
        content = content.replace(regexP, '');
    }

    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log('Fixed', file);
    }
});
