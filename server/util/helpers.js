const _ = require('lodash');
const request = require('request-promise');
const btoa = require('btoa');
const config = require('../../serverconfig');
const logger = require('./logger');

const { mergedCats } = config;

/**
 * parseSocketUpdates
 * parseSocketUpdates, parse buffered socket stream, sort updates
 * @param payload {Array} buffered socket stream
 * @returns {Object}
 */
const parseSocketUpdates = (payload) => {
  let updates = {
    uTimer: [],
    uScore: [],
  };
  const currentlyInUse = ['uTimer', 'uScore'];
  _.each(payload, (data) => {
    const { body } = data;
    if (_.isArray(body)) {
      _.each(body, (update) => {
        if (updates[update.label]) {
          updates[update.label].push(update);
        }
      });
    } else if (updates[body.label]) {
      updates[body.label].push(body);
    }
  });
  updates = _.pick(updates, currentlyInUse);
  return updates;
};

function deUmlaut(value) {
  let parsed = value.toLowerCase();
  parsed = parsed.replace(/ä/g, 'ae');
  parsed = parsed.replace(/ö/g, 'oe');
  parsed = parsed.replace(/ü/g, 'ue');
  parsed = parsed.replace(/ß/g, 'ss');
  parsed = parsed.replace(/ /g, '-');
  parsed = parsed.replace(/\./g, '');
  parsed = parsed.replace(/,/g, '');
  parsed = parsed.replace(/\(/g, '');
  parsed = parsed.replace(/\)/g, '');
  return parsed;
}

/* eslint-disable */
const reParts = /\d+|\D+/g;

// Regular expression to test if the string has a digit.
const reDigit = /\d/;

// Add cmpStringsWithNumbers to the global namespace.  This function takes to
// strings and compares them, returning -1 if `a` comes before `b`, 0 if `a`
// and `b` are equal, and 1 if `a` comes after `b`.
const cmpStringsWithNumbers = function (a, b) {
  // Get rid of casing issues.
  a = a.toUpperCase();
  b = b.toUpperCase();

  // Separates the strings into substrings that have only digits and those
  // that have no digits.
  var aParts = a.match(reParts);
  var bParts = b.match(reParts);

  // Used to determine if aPart and bPart are digits.
  var isDigitPart;

  // If `a` and `b` are strings with substring parts that match...
  if (aParts && bParts &&
    (isDigitPart = reDigit.test(aParts[0])) == reDigit.test(bParts[0])) {
    // Loop through each substring part to compare the overall strings.
    var len = Math.min(aParts.length, bParts.length);
    for (var i = 0; i < len; i++) {
      var aPart = aParts[i];
      var bPart = bParts[i];

      // If comparing digits, convert them to numbers (assuming base 10).
      if (isDigitPart) {
        aPart = parseInt(aPart, 10);
        bPart = parseInt(bPart, 10);
      }

      // If the substrings aren't equal, return either -1 or 1.
      if (aPart != bPart) {
        return aPart < bPart ? -1 : 1;
      }

      // Toggle the value of isDigitPart since the parts will alternate.
      isDigitPart = !isDigitPart;
    }
  }

  // Use normal comparison.
  return (a >= b) - (a <= b);
};
/* eslint-enable */

function prepareChildren(children) {
  return _.reduce(children, (acc, el) => acc.concat(Object.assign(el, {
    children: (el.children || []).sort((a, b) => cmpStringsWithNumbers(deUmlaut(`${a.path}${a.label}`), deUmlaut(`${b.path}${b.label}`)))
      .map((child) => Object.assign(child, { top_category_id: el.id })),
  })), []);
}

function convertEventToResult(event, score) {
  const cats = event.category_tree.concat(event.category_id) || [];
  return {
    id: parseFloat(event.evid),
    bid: parseFloat(event.betradar_id),
    expires_ts: new Date(event.datetime2).getTime() / 1000,
    cid: parseFloat(event.category_id),
    cats: cats.map((cid, index) => ({
      label: {
        de: event.path && _.trim(event.path.split('/')[index]),
        en: event.path && _.trim(event.path.split('/')[index]),
      },
      id: parseFloat(cid),
      topcatid: index === 0 ? 0 : parseFloat(cats[index - 1]),
    })),
    teams: {
      home: {
        label: event.label && event.label.indexOf(' - ') !== -1 ? event.label.split(' - ')[0] : event.label,
      },
      away: {
        label: event.label && event.label.indexOf(' - ') !== -1 ? event.label.split(' - ')[1] : event.label,
      },
    },
    json: {
      data: score || {
        score_str: '',
        periods: [],
      },
    },
    label: {
      de: event.label,
      en: event.label,
    },
    category_path: {
      de: event.path,
      en: event.path,
    },
  };
}

function mergeAsTopCategory(catId) {
  return mergedCats[catId];
}

function isWinner(event) {
  return event.label && event.label.indexOf(' - ') === -1;
}

function isLongTime(event) {
  return isWinner(event);
}

/**
 * putEvent
 * putting event to DB
 * @param event
 * @returns {*|Promise<T>}
 */
const putEvent = (event) => {
  if (parseFloat(event.bid) === 0 || !event.bid) {
    //  delete event.bid;
    //  delete event.betradar_id;
    logger.log('info', `PUT ended events without betradar ${new Date()} ${JSON.stringify(event)}`);
    return request({
      method: 'GET',
      uri: `https://api2.tb.exxs.net/oldapi.php?task=insert_ergebnislist&data=${btoa(JSON.stringify(event))}`,
    }).catch((e) => {
      logger.log('error', `PUT ended events error ${new Date()} ${e.message}`);
    });
  }
  return event;
};

module.exports = {
  parseSocketUpdates,
  prepareChildren,
  convertEventToResult,
  mergeAsTopCategory,
  isWinner,
  isLongTime,
  putEvent,
};
