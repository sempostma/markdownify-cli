const TurndownService = require('turndown')

module.exports = (content, options) => {
    const turndownService = new TurndownService(options);

    turndownService.addRule('strikethrough', {
        filter: ['del', 's', 'strike'],
        replacement: function (content) {
            return '~' + content + '~'
        }
    });

    turndownService.addRule('preascode', {
        filter: ['pre'],
        replacement: function (content) {
            return '```' + content + '```'
        }
    });

    turndownService.remove('del', 'script', 'style', 'meta')

    return turndownService.turndown(content);
}
