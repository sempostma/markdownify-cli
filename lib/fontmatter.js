const { EOL } = require('os');
const yaml = require('yaml');

const removeUndefined = obj => JSON.parse(JSON.stringify(obj));

module.exports = document => { 

    const author = document.querySelector('meta[name="author"]')
    const authorLink = document.querySelector('link[rel="author"]')
    const title = document.querySelector('title');
    const canonical = document.querySelector('link[rel="canonical"]');
    const description = document.querySelector('meta[name="description"]');
    const publisherLink = document.querySelector('link[rel="publisher"]');
    const shortlink = document.querySelector('link[rel="shortlink"]');
    const image_src = document.querySelector('link[rel="image_src"]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const applicationLdJson = document.querySelector('script[type="application/ld+json"]');

    const applicationLd = applicationLdJson && applicationLdJson.textContent && JSON.parse(applicationLdJson.textContent) || {}

    const { datePublished, dateModified, keywords, image, publisher } = applicationLd;
    
    const frontmatter = {
        title: title && title.textContent,
        author: author ? author.getAttribute('content') : authorLink ? authorLink.getAttribute('href') : undefined,
        canonical: (canonical && canonical.getAttribute('href')) || undefined,
        description: (description && description.getAttribute('content')) || undefined,
        publisher: (publisherLink && publisherLink.getAttribute('href')) || (publisher && publisher.name) || undefined,
        shortlink: (shortlink && shortlink.getAttribute('href')) || undefined,
        lang: (document.documentElement.getAttribute('lang')) || undefined,
        image: (image_src && image_src.getAttribute('href')) || (ogImage && ogImage.getAttribute('content')) || image || undefined,
        datePublished,
        dateModified,
        keywords: (metaKeywords && metaKeywords.getAttribute('content') && metaKeywords.getAttribute('content').split(/\s*,\s*/)) || keywords || undefined,
    };
    
    return `---${EOL}${yaml.stringify(removeUndefined(frontmatter))}---${EOL}${EOL}`
};
