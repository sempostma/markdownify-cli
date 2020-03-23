# markdownify-cli
Convert a website to static markdown.

## Install

```bash
npm i -g https://github.com/sempostma/markdownify-cli.git
```

## Usage

```bash
md-pull process -h
# Usage: process [options] [urls...]

# Options:
#  -o, --out <out>                          Output directory
#  -r, --root <root>                        Root element
#  -i, --imagedir <imagedir>                Image directory
#  -p, --publicimagepath <publicimagepath>  Public path to images
#  -c, --crawl                              Recursively crawl all of the pages linked to this page.
#  -f, --frontmatter                        Include some common front matter entries in YAML format.
#  -h, --help                               output usage information
```
## Options

--out: The absolute or relative output directory

--root: The root element (css selector), for example main, body, #table_with_data or .first_css_class

--imagedir: The directory for images, for example img

--publicimagepath: The path to the images as outputted in markdown. Can be usefull if you expect the images to be in a specific folder.

--crawl: Recursively crawl all pages

--frontmatter: Include important front matter items

