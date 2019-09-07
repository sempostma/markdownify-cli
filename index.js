const program = require('commander');
const processCommand = require('./lib/process');
const pjson = require('./package.json');

program
    .version(pjson.version)
    .command('process [urls...]')
    .option('-o, --out <out>', 'Output directory')
    .option('-r, --root <root>', 'Root element')
    .option('-i, --imagedir <imagedir>', 'Image directory')
    .option('-p, --publicimagepath <publicimagepath>', 'Public path to images')
    .option('-c, --crawl', 'Recursively crawl all of the pages linked to this page.')
    .option('-f, --frontmatter', 'Include some common front matter entries in YAML format.')
    .action(processCommand)

program.parse(process.argv);
