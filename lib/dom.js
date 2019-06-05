const { JSDOM } = require('jsdom');

module.exports = content => new JSDOM(content).window.document;

