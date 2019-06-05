const program = require('commander');
const fetch = require('node-fetch');
const slugify = require('slugify');
const { URL } = require('url');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const http = require('http');
const https = require('https');

const parse = require('./lib/dom');
const turndown = require('./lib/turndown');
const pjson = require('./package.json');

const httpAgent = new http.Agent({
    keepAlive: true
});
const httpsAgent = new https.Agent({
    keepAlive: true
});

const defaults = {
    imagedir: './images',
    root: 'body',
    out: null,
};

const fetchOptions = {
    agent: function (_parsedURL) {
        if (_parsedURL.protocol == 'http:') {
            return httpAgent;
        } else {
            return httpsAgent;
        }
    },
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0' },
}

program
    .version(pjson.version)
    .command('pull [urls...]')
    .option('-o, --out <out>', 'Output directory')
    .option('-r, --root <root>', 'Root element')
    .option('-i, --imagedir <imagedir>', 'Image directory')
    .action(async (urls, cmd) => {
        const options = Object.assign({}, defaults, cmd);
        const spinner = ora('Loading webpages').start();

        urls = urls.map(url => /^https?:\/\//.test(url) ? url : 'http://' + url);

        const images = {};

        const promises = urls.map(async url => {
            const response = await fetch(url, fetchOptions);
            const text = await response.text();
            const mime = response.headers.get('content-type');

            if (!mime.includes('/html')) {
                throw new Error(`This is not an html file. This is a "${mime}" file.`);
            }
            const { documentElement, body, head } = parse(text);
            const imgs = documentElement.querySelectorAll('img');


            if (options.out) {
                for (let i = 0; i < imgs.length; i++) {
                    try {
                        const img = imgs[i];
                        const src = img.src || img.getAttribute('data-src');
                        const imgurl = new URL(src, url);
                        if (!src || imgurl.host !== imgurl.host) continue;
                        spinner.text = `Loading images ${i + 1}/${imgs.length}`;
                        const dir = path.join(options.imagedir, imgurl.pathname);
                        const responsePromise = fetch(imgurl, fetchOptions);
                        if (imgurl in images === false) {
                            images[imgurl] = { responsePromise, dir };
                            img.src = dir;
                            await responsePromise;
                        }
                    } catch (err) {
                        console.warn(`Unable to fetch image "${imgurl}": ${err}`);
                    }

                }
                spinner.text = 'Finished loading images';
            }

            const root = documentElement.querySelector(options.root);
            const markdown = turndown(root) || '';

            if (!options.out) {
                console.log(markdown);
            }

            return markdown;
        });

        const pages = await Promise.all(promises);

        if (options.out) {
            for (let i = 0; i < pages.length; i++) {
                try {
                    spinner.text = `Writing pages ${i + 1}/${pages.length}`;
                    const page = pages[i];
                    let { pathname } = new URL(urls[i]);
                    if (pathname === '/') pathname = '/index.md';
                    else pathname = pathname.replace('.html', '') + '.md';
                    const filepath = path.resolve(options.out, path.basename(pathname));
                    await fs.ensureDir(path.dirname(filepath));
                    await fs.writeFile(filepath, page);
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
    });

program.parse(process.argv);
