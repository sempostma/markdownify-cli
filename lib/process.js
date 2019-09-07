const fetch = require('node-fetch');
const slugify = require('slugify');
const { URL } = require('url');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const http = require('http');
const https = require('https');
const getFrontmatter = require('./fontmatter');
require('colors');

const parse = require('./dom');
const turndown = require('./turndown');

const httpAgent = new http.Agent({
    keepAlive: true
});
const httpsAgent = new https.Agent({
    keepAlive: true
});


const fetchOptions = {
    agent: function (_parsedURL) {
        if (_parsedURL.protocol == 'http:') {
            return httpAgent;
        } else {
            return httpsAgent;
        }
    },
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0' },
};


const defaults = {
    imagedir: './images',
    root: 'body',
    out: null,
    crawl: false
};

module.exports = async (urls, cmd) => {

    const options = Object.assign({}, defaults, cmd);
    if (!options.publicimagepath) options.publicimagepath = options.imagedir;

    const spinner = ora('Loading webpages').start();

    urls = urls.map(url => /^https?:\/\//.test(url) ? url : 'http://' + url)
        .map(url => new URL(url));

    const doneURLS = Object.assign({}, ...urls.map(url => ({ [url]: true })));

    const pages = [];

    const images = {};

    while (urls.length > 0) {
        const url = urls.splice(0, 1)[0];
        spinner.text = `Loading url "${url.pathname.green}"`;
        let text;
        try {
            const response = await fetch(url, fetchOptions);
            text = await response.text();
            const mime = response.headers.get('content-type');
            if (!mime.includes('/html')) {
                console.error(`This is not an html file. This is a "${mime}" file.`);
                continue;
            }
        } catch (err) {
            console.error(`Unable to fetch file url "${url}"`, err);
            continue;
        }

        const document = parse(text);
        const { documentElement, body, head } = document;
        const imgs = documentElement.querySelectorAll('img');
        const anchors = documentElement.querySelectorAll('a');

        if (options.crawl) {
            for (let i = 0; i < anchors.length; i++) {
                try {
                    const a = anchors[i];
                    const href = a.href || a.getAttribute('data-href');
                    const aurl = new URL(href, url);
                    if (href && aurl.host === url.host && href in doneURLS === false) {
                        urls.push(aurl);
                        doneURLS[aurl.href] = true;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            spinner.text = 'Finished loading images';
        }

        if (options.out) {
            for (let i = 0; i < imgs.length; i++) {
                try {
                    const img = imgs[i];
                    const src = img.src || img.getAttribute('data-src');
                    const imgurl = new URL(src, url);
                    if (!src || imgurl.host !== imgurl.host) continue;
                    spinner.text = `Loading images ${i + 1}/${imgs.length}`;
                    const pathname = decodeURIComponent(imgurl.pathname);
                    const dir = path.join(options.imagedir, pathname);
                    const publicpath = path.join(options.publicimagepath, pathname)
                    const responsePromise = fetch(imgurl, fetchOptions);
                    img.src = publicpath.replace(/\\/g, '/');
                    if (imgurl in images === false) {
                        images[imgurl] = { responsePromise, dir };
                        await responsePromise;
                    }
                } catch (err) {
                    console.warn(`Unable to fetch image "${imgurl}": ${err}`);
                }

            }
            spinner.text = 'Finished loading images';
        }

        const root = documentElement.querySelector(options.root);
        if (root) {
            try {
                const markdown = turndown(root) || '';
                if (!options.out) {
                    console.log(markdown);
                }

                let frontmatter = '';

                if (options.frontmatter) {
                    frontmatter = getFrontmatter(document);
                }

                pages.push({ markdown, url, frontmatter });
            } catch (err) {
                console.error('Error while parsing markdown on page', url.href);
                continue;
            }
        }
    }

    if (options.out) {
        for (let i = 0; i < pages.length; i++) {
            try {
                spinner.text = `Writing pages ${i + 1}/${pages.length}`;
                const { markdown, url, frontmatter } = pages[i];
                let { pathname } = url;
                if (pathname === '/') pathname = '/index.md';
                else pathname = pathname.replace('.html', '') + '.md';
                pathname = decodeURIComponent(pathname);
                const filepath = path.resolve(options.out, path.basename(pathname));
                await fs.ensureDir(path.dirname(filepath));
                await fs.writeFile(filepath, frontmatter + markdown);
            } catch (err) {
                console.error(err);
            }
        }
        let i = 0;
        const len = Object.keys(images).length;
        for (const url in images) {
            spinner.text = `Writing images ${i++}/${len}`;
            const { responsePromise, dir } = images[url];
            try {
                const response = await responsePromise;
                const buffer = await response.buffer();
                const filepath = path.resolve(options.out, dir);
                await fs.ensureDir(path.dirname(filepath));
                await fs.writeFile(filepath, buffer);
            } catch (err) {
                console.warn(`Unable to write image "${url}": ${err}`);
            }
        }
    }

    spinner.stop();
};

